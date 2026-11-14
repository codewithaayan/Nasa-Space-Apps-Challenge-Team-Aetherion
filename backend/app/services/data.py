"""Rhido integration boundary: local, monthly, rectilinear gridded data."""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

from app.models.schemas import Variable


class DataUnavailable(Exception):
    pass


class NotFound(Exception):
    pass


class SelectionTooLarge(ValueError):
    pass


def data_root() -> Path:
    return Path(os.getenv('DATA_ROOT', str(Path(__file__).resolve().parents[2] / 'data'))).resolve()


def local_path(value: str) -> Path:
    root = data_root()
    if Path(value).is_absolute():
        raise DataUnavailable('Catalog paths must be relative to DATA_ROOT')
    path = (root / value).resolve()
    if not path.is_relative_to(root):
        raise DataUnavailable('Catalog paths must stay inside DATA_ROOT')
    return path


class LocalDataSource:
    def catalog(self) -> list[Variable]:
        path = data_root() / 'catalog.json'
        if not path.exists():
            if os.getenv('MOCK_DATA', 'false').lower() == 'true':
                return [Variable(id='mock_temperature', name='Synthetic temperature (NOT NASA)',
                    units='K', source='Deterministic synthetic fixture', provenance='mock')]
            return []
        try:
            records = [Variable.model_validate(r) for r in json.loads(path.read_text())['variables']]
            if len({r.id for r in records}) != len(records):
                raise ValueError('Duplicate variable IDs')
            return records
        except (ValueError, KeyError, TypeError, OSError) as exc:
            raise DataUnavailable('Invalid catalog.json') from exc

    def load(self, variable: str, box: list[float], start=None, end=None):
        meta = next((m for m in self.catalog() if m.id == variable), None)
        if meta is None:
            raise NotFound(f'Unknown variable: {variable}; consult /variables')
        if start and end and start > end:
            raise ValueError('start must be on or before end')
        if meta.annual_aggregation == 'sum' and meta.variable_type != 'monthly_amount':
            raise DataUnavailable('Annual sums require variable_type monthly_amount; convert rates upstream')
        if meta.path is None:
            if meta.provenance != 'mock' or meta.id != 'mock_temperature':
                raise DataUnavailable('No local data path configured')
            time = pd.date_range('2000-01-01', periods=240, freq='MS')
            t = np.arange(240)
            values = 280 + .02*t + 3*np.sin(2*np.pi*t/12)
            da = xr.DataArray(np.broadcast_to(values[:, None, None], (240, 3, 4)),
                dims=('time','latitude','longitude'), coords={'time': time,
                'latitude': [-60, 0, 60], 'longitude': [-135, -45, 45, 135]}, attrs={'units':'K'})
        else:
            path = local_path(meta.path)
            if not path.exists():
                raise DataUnavailable(f'Dataset missing for {variable}')
            try:
                opener = xr.open_zarr if path.suffix == '.zarr' else xr.open_dataset
                with opener(path) as ds:
                    da = ds[meta.field or variable]
                    renames = {c: target for target, names in {
                        'latitude': ('lat',), 'longitude': ('lon',), 'time': ('date',)}.items()
                        for c in names if c in da.dims and target not in da.dims}
                    da = da.rename(renames)
                    actual_resolution = {}
                    for coordinate in ('latitude', 'longitude'):
                        if coordinate in da.coords and da[coordinate].size > 1:
                            differences = np.diff(np.sort(da[coordinate].values))
                            if np.allclose(differences, differences[0]) and differences[0] > 0:
                                actual_resolution[f'{coordinate}_degrees'] = float(differences[0])
                    da = self.select(da, box, start, end).load()
            except SelectionTooLarge:
                raise
            except (ValueError, KeyError, OSError, ImportError) as exc:
                raise DataUnavailable('Cannot read prepared dataset; run the local validation command') from exc
            if da.attrs.get('units') != meta.units:
                raise DataUnavailable('Dataset units must match catalog units exactly')
            meta = meta.model_copy(update={'temporal_coverage': [str(da.time.values[0])[:10], str(da.time.values[-1])[:10]],
                                          'spatial_resolution': actual_resolution or meta.spatial_resolution})
            return meta, da
        return meta, self.select(da, box, start, end)

    @staticmethod
    def select(da, box, start, end):
        if set(da.dims) != {'time', 'latitude', 'longitude'}:
            raise ValueError('Expected exactly time, latitude, longitude dimensions')
        for coord in ('latitude', 'longitude'):
            if da[coord].ndim != 1 or not np.isfinite(da[coord]).all():
                raise ValueError('Expected finite rectilinear spatial coordinates')
            differences = np.diff(np.sort(da[coord].values))
            if len(differences) > 1 and not np.allclose(differences, differences[0]):
                raise ValueError('Cosine area weights require a regular grid; preprocess irregular cell areas')
        if bool((abs(da.latitude) > 90).any()) or bool(((da.longitude < -180) | (da.longitude > 360)).any()):
            raise ValueError('Dataset coordinates out of range')
        da = da.assign_coords(longitude=((da.longitude + 180) % 360) - 180)
        # A duplicated cyclic endpoint (-180 / +180) is ambiguous; fail explicitly.
        for coord in ('latitude', 'longitude'):
            if da[coord].to_index().has_duplicates:
                raise ValueError('Duplicate spatial coordinates')
        da = da.sortby('latitude').sortby('longitude').sortby('time')
        if not np.issubdtype(da.time.dtype, np.datetime64):
            raise ValueError('Use decoded Gregorian datetime coordinates, not numeric time')
        try:
            times = pd.DatetimeIndex(da.time.values)
        except (TypeError, ValueError) as exc:
            raise ValueError('Use Gregorian monthly timestamps') from exc
        if times.hasnans or times.to_period('M').has_duplicates:
            raise ValueError('Expected one record per calendar month')
        da = da.assign_coords(time=times.to_period('M').to_timestamp())
        w, s, e, n = box
        longitude = ((da.longitude >= w) & (da.longitude <= e)) if w < e else ((da.longitude >= w) | (da.longitude <= e))
        if e == 180:
            longitude = longitude | (da.longitude == -180)
        da = da.sel(latitude=da.latitude[(da.latitude >= s) & (da.latitude <= n)],
                    longitude=da.longitude[longitude])
        first = str(pd.Period(start, freq='M').start_time.date()) if start else None
        last = str(pd.Period(end, freq='M').start_time.date()) if end else None
        da = da.sel(time=slice(first, last))
        if any(da.sizes[c] == 0 for c in da.dims):
            raise NotFound('No grid-cell centers or months in requested selection')
        if da.sizes['time'] > 600 or da.sizes['latitude'] * da.sizes['longitude'] > 100:
            raise SelectionTooLarge('Selection limit: 600 months and 100 cells; choose a smaller/coarser region')
        if times.size and (times[-1].to_period('M') - times[0].to_period('M')).n > 599:
            # Enforce against selected dates, not the complete source archive.
            span = (pd.Timestamp(da.time.values[-1]).to_period('M') - pd.Timestamp(da.time.values[0]).to_period('M')).n + 1
            if span > 600:
                raise SelectionTooLarge('Selection spans more than 600 calendar months')
        return da.transpose('time', 'latitude', 'longitude')


def regional_series(da) -> pd.Series:
    weights = np.cos(np.deg2rad(da.latitude)).where(abs(da.latitude) < 90, 0)
    averaged = da.weighted(weights).mean(('latitude', 'longitude'), skipna=True)
    series = averaged.to_series()
    if not series.notna().any():
        raise NotFound('No finite observations in selection')
    return series
