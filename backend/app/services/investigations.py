"""Shared integration contract for source CSVs and the existing grid adapter."""
import numpy as np
import pandas as pd
import xarray as xr

from app.models.csv_datasets import CsvAnalysis, CsvDataset, FeatureStatus, Verdict
from app.services.analysis_cache import cached_analyze
from app.services.csv_data import CsvDataSource
from app.services.data import DataUnavailable, LocalDataSource, NotFound, local_path, regional_series
from app.services.geo import parse_bbox
from app.services.paradox import find_paradox
from app.services.statistics import monthly_series, points


def grid_info(meta):
    """Inspect coordinates, without loading the full gridded variable into memory."""
    if meta.path is None:
        _, array = LocalDataSource().load(meta.id, [-180, -90, 180, 90])
        return _grid_info(meta, array, 'synthetic', None)
    path = local_path(meta.path)
    try:
        opener = xr.open_zarr if path.suffix == '.zarr' else xr.open_dataset
        with opener(path) as source:
            array = source[meta.field or meta.id]
            renames = {name: target for target, aliases in {
                'latitude': ('lat',), 'longitude': ('lon',), 'time': ('date',)}.items()
                for name in aliases if name in array.dims and target not in array.dims}
            return _grid_info(meta, array.rename(renames),
                              'zarr' if path.suffix == '.zarr' else 'netcdf', path)
    except (OSError, ValueError, KeyError, ImportError) as exc:
        raise DataUnavailable('Cannot inspect gridded dataset; run the dataset validator') from exc


def _grid_info(meta, array, storage, path):
    if set(array.dims) != {'time', 'latitude', 'longitude'}:
        raise ValueError('Expected time, latitude, longitude')
    if not np.issubdtype(array.time.dtype, np.datetime64):
        raise ValueError('Use decoded Gregorian monthly timestamps')
    dates = pd.DatetimeIndex(array.time.values)
    lat = np.asarray(array.latitude.values, dtype=float)
    longitude = np.asarray(array.longitude.values, dtype=float)
    lon = ((longitude + 180) % 360) - 180
    if dates.empty or dates.hasnans or dates.to_period('M').has_duplicates:
        raise ValueError('Invalid monthly dates')
    if lat.ndim != 1 or lon.ndim != 1 or not np.isfinite(lat).all() or not np.isfinite(lon).all():
        raise ValueError('Invalid coordinates')
    if np.any(abs(lat) > 90) or np.any((longitude < -180) | (longitude > 360)):
        raise ValueError('Coordinates out of range')
    if np.unique(lat).size != lat.size or np.unique(lon).size != lon.size:
        raise ValueError('Duplicate cell centres')
    # Epsilon ensures a selectable box for point datasets; it is not a footprint.
    box = [max(-180., float(lon.min()) - 1e-6), max(-90., float(lat.min()) - 1e-6),
           min(180., float(lon.max()) + 1e-6), min(90., float(lat.max()) + 1e-6)]
    box = [round(value, 6) for value in box]
    first, last = dates.min().to_period('M'), dates.max().to_period('M')
    slots = (last - first).n + 1
    cells = lat.size * lon.size
    limitations = list(meta.limitations) + ['Exploratory analysis; scientific review has not been completed.']
    if meta.provenance == 'mock':
        limitations.append('Synthetic fixture, NOT NASA observations.')
    if cells > 100:
        limitations.append('Choose a smaller bounding box: analysis is limited to 100 cells per selection.')
    stat = path.stat() if path else None
    return CsvDataset(id='grid__' + meta.id, location_id=meta.location_id or 'region',
        topic=meta.topic or meta.id, name=meta.name, units=meta.units,
        source=meta.source, source_url=meta.source_url, dataset_id=meta.dataset_id,
        version=meta.version, source_file=path.name if path else None,
        source_revision=f'{stat.st_mtime_ns}:{stat.st_size}' if stat else 'deterministic-fixture',
        data_kind=meta.data_kind, provenance=meta.provenance, storage_format=storage,
        temporal_coverage=[str(first.start_time.date()), str(last.start_time.date())],
        finite_months=None, monthly_slots=slots, requested_bbox=box,
        data_bbox=[float(lon.min()), float(lat.min()), float(lon.max()), float(lat.max())],
        spatial_support=meta.spatial_support,
        spatial_analysis_available=cells > 1, limitations=limitations)


class Investigations:
    def catalog(self, location=None):
        datasets = CsvDataSource().catalog()
        datasets.extend(grid_info(meta) for meta in LocalDataSource().catalog())
        if len({d.id for d in datasets}) != len(datasets):
            raise DataUnavailable('Duplicate dataset IDs across providers')
        return [d for d in datasets if location is None or d.location_id == location]

    def analyze(self, dataset_id, start=None, end=None, bbox=None):
        meta = next((d for d in self.catalog() if d.id == dataset_id), None)
        if meta is None:
            raise NotFound('Unknown dataset; consult /datasets')
        array = None
        variable = None
        box = None
        if meta.storage_format == 'csv':
            if bbox:
                raise ValueError('A spatially averaged CSV cannot be subset to a different bounding box')
            meta, raw = CsvDataSource().load(dataset_id, start, end)
        else:
            first, last = [pd.Timestamp(t).to_period('M') for t in meta.temporal_coverage]
            if (start and pd.Period(start, freq='M') < first) or (end and pd.Period(end, freq='M') > last):
                raise ValueError('Requested dates exceed dataset coverage; consult /datasets')
            box = parse_bbox(bbox) if bbox else meta.requested_bbox
            variable, array = LocalDataSource().load(dataset_id.removeprefix('grid__'), box, start, end)
            raw = regional_series(array)
            monthly = monthly_series(raw)
            meta = meta.model_copy(update={'temporal_coverage': [str(monthly.index[0].start_time.date()),
                str(monthly.index[-1].start_time.date())], 'finite_months': int(monthly.notna().sum()),
                'monthly_slots': len(monthly), 'requested_bbox': box,
                'spatial_analysis_available': array.sizes['latitude'] * array.sizes['longitude'] > 1,
                'data_bbox': [float(array.longitude.min()), float(array.latitude.min()),
                              float(array.longitude.max()), float(array.latitude.max())]})
        warnings = list(meta.limitations)
        try:
            trend = cached_analyze(raw, meta.units)
        except ValueError as exc:
            trend = None
            warnings.append(str(exc))
        paradox = None
        spatial_reason = 'Per-cell monthly histories are not available in this source export.'
        if array is not None:
            if array.sizes['latitude'] * array.sizes['longitude'] > 1:
                paradox = find_paradox(variable, array, box)
                warnings.extend(paradox.warnings)
                spatial_reason = None
            else:
                spatial_reason = 'Only one native grid cell is selected; opposing spatial trends require multiple cells.'
        if trend is None:
            summary = 'Monthly source values are available, but this selection does not support trend estimation.'
        else:
            warnings = list(dict.fromkeys(trend.warnings + warnings))
            trend.warnings = warnings
            if trend.p_value is None:
                finding = 'Statistical significance could not be assessed for this selection.'
            elif trend.significant:
                finding = f'The test supports a statistically significant {"increasing" if trend.slope > 0 else "decreasing"} trend under its assumptions.'
            else:
                finding = 'The test does not establish a statistically significant trend; this does not prove an absence of change.'
            summary = f'The estimated change is {trend.slope:.5g} {trend.slope_units}. {finding} These exploratory results do not establish a cause.'
        warnings = list(dict.fromkeys(warnings))
        return CsvAnalysis(dataset=meta, series=points(monthly_series(raw)), trend=trend,
            selection_bbox=box, paradox=paradox, summary=summary, warnings=warnings,
            verdict=Verdict(verdict=summary, caveats=warnings, provenance=meta.provenance),
            feature_status={
                'trend': FeatureStatus(available=trend is not None,
                    reason=None if trend else 'Selected monthly coverage does not support trend estimation.'),
                'paradox': FeatureStatus(available=paradox is not None, reason=spatial_reason),
                'years_to_significance': FeatureStatus(available=False,
                    reason='A validated future effect/noise model has not been configured.'),
                'ai_verdict': FeatureStatus(available=False,
                    reason='The current verdict is a deterministic explanation, without a configured AI provider.')})
