"""Read source-export time series without manufacturing spatial cells.

Original CSV bytes are unchanged. Source units follow product documentation and
export requests; any supported display-unit conversion is explicit in metadata.
Existing gridded data adapters and statistics stay separate.
"""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np
import pandas as pd

from app.models.csv_datasets import CsvDataset, UnitConversion
from app.models.schemas import Point
from app.services.data import DataUnavailable, NotFound


def csv_root() -> Path:
    default = Path(__file__).resolve().parents[3] / 'Data'
    return Path(os.getenv('CSV_DATA_ROOT', str(default))).resolve()


def latest_record(series: pd.Series) -> Point:
    value = series.iloc[-1]
    return Point(time=str(series.index[-1].to_period('M')), value=float(value) if pd.notna(value) else None)


class CsvDataSource:
    def records(self):
        try:
            root = csv_root()
            # Explicit single-manifest roots remain supported for offline fixtures
            # and installations that intentionally expose only one collection.
            direct = root / 'manifest.json'
            manifests = [direct] if direct.exists() else sorted(root.glob('*/manifest.json'))
            records = []
            for path in manifests:
                folder = path.parent.resolve()
                if not folder.is_relative_to(root) or not path.resolve().is_relative_to(root):
                    raise ValueError('Manifest must stay inside CSV_DATA_ROOT')
                for record in json.loads(path.read_text(encoding='utf-8'))['datasets']:
                    relative = Path(record['file'])
                    source = (folder / relative).resolve()
                    if relative.is_absolute() or not source.is_relative_to(folder):
                        raise ValueError('CSV must stay inside its manifest directory')
                    records.append({**record, 'file': source.relative_to(root).as_posix()})
            if len({r['id'] for r in records}) != len(records):
                raise ValueError('Duplicate IDs')
            return records
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise DataUnavailable('Cannot read CSV dataset manifest') from exc

    def catalog(self, location: str | None = None):
        return [self._read(r)[0] for r in self.records()
                if location is None or r['location_id'] == location]

    def load(self, dataset_id: str, start=None, end=None):
        record = next((r for r in self.records() if r['id'] == dataset_id), None)
        if record is None:
            raise NotFound('Unknown dataset; consult /datasets')
        meta, series = self._read(record)
        first = pd.Timestamp(start).to_period('M').start_time if start else series.index[0]
        last = pd.Timestamp(end).to_period('M').start_time if end else series.index[-1]
        if first > last:
            raise ValueError('start must be on or before end')
        if first < series.index[0] or last > series.index[-1]:
            raise ValueError('Requested dates exceed dataset coverage; consult /datasets')
        series = series.loc[first:last]
        if series.empty:
            raise NotFound('No months in requested selection')
        if not series.notna().any():
            raise NotFound('No finite values in requested selection')
        meta = meta.model_copy(update={
            'temporal_coverage': [str(series.index[0].date()), str(series.index[-1].date())],
            'latest_record': latest_record(series),
            'finite_months': int(series.notna().sum()), 'monthly_slots': len(series)})
        return meta, series

    @staticmethod
    def _read(record):
        try:
            root = csv_root()
            path = (root / record['file']).resolve()
            if not path.is_relative_to(root) or path.suffix.lower() != '.csv':
                raise ValueError('Invalid source path')
            if path.stat().st_size > 5_000_000:
                raise ValueError('Oversized CSV')
            raw = path.read_bytes()
            rows = list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))
            header_at = next(i for i, row in enumerate(rows)
                             if row and row[0].strip() in ('time', 'File Name'))
            headers = [v.strip() for v in rows[header_at]]
            metadata = {r[0].strip().rstrip(':'): r[1].strip() for r in rows[:header_at] if len(r) == 2}
            time_index = headers.index(record['time_column'])
            value_index = headers.index(record['value_column'])
            values, dates = [], []
            fill = next((float(v) for k, v in metadata.items() if k.startswith('Fill Value')), None)
            for row in rows[header_at + 1:]:
                if not row or not any(v.strip() for v in row):
                    continue
                value = float(row[value_index]) if row[value_index].strip() else np.nan
                if np.isinf(value):
                    raise ValueError('Infinite CSV values')
                values.append(np.nan if value == fill else value)
                dates.append(row[time_index])
            index = pd.DatetimeIndex(pd.to_datetime(dates, errors='raise'))
            if index.hasnans or index.to_period('M').has_duplicates or not index.is_monotonic_increasing:
                raise ValueError('Expected sorted unique monthly dates')
            series = pd.Series(values, index=index.to_period('M').to_timestamp(), dtype=float)
            if series.empty or not series.notna().any():
                raise ValueError('No source data')
            months = pd.date_range(series.index[0], series.index[-1], freq='MS')
            if len(months) > 600:
                raise ValueError('CSV exceeds 600 months')
            series = series.reindex(months)
            source_units = record.get('source_units', record['units'])
            conversion = None
            if source_units != record['units']:
                if record['topic'] != 'precipitation' or (source_units, record['units']) != ('inch/day', 'mm/hr'):
                    raise ValueError('Unsupported source-unit conversion')
                conversion = UnitConversion(source_units=source_units, target_units=record['units'],
                    factor=25.4 / 24, method='mm/hr = inch/day × 25.4 ÷ 24 (1 inch = 25.4 mm; 1 day = 24 hours)')
                # Convert before every calculation so values, slopes and intervals
                # all use the declared response unit. Missing months remain missing.
                series = series * conversion.factor
            warnings = [
                'Exploratory analysis; scientific review has not been completed.',
                'Source-export provenance is declared by the supplied files; it is not independently authenticated.',
                'No per-cell monthly grid is included; regional trend mapping and Paradox Finder are unavailable.',
                'The annual significance test uses equal-month annual means; rate values are not annual accumulated totals.',
            ] + record.get('limitations', [])
            if conversion:
                warnings.append('Precipitation rates converted from inch/day to mm/hr using 25.4 / 24; original CSV bytes are unchanged.')
            if record.get('provenance') == 'mock':
                warnings.append('Synthetic fixture, NOT NASA observations.')
            requested = metadata.get('User Bounding Box')
            data_box = metadata.get('Data Bounding Box')
            url = metadata.get('URL to Reproduce Results')
            if url:
                query = parse_qs(urlparse(url).fragment)
                requested_end = query.get('endtime', [''])[0][:7]
                if requested_end and requested_end != str(series.index[-1])[:7]:
                    warnings.append('Reproduction URL end date conflicts with actual CSV coverage; source request needs reconciliation.')
            meta = CsvDataset(
                id=record['id'], location_id=record['location_id'], topic=record['topic'],
                name=record['name'], units=record['units'], source=record['source'],
                source_units=source_units, unit_conversion=conversion,
                source_url=url or record.get('source_url'), documentation_url=record.get('documentation_url'),
                source_file=path.name, source_sha256=hashlib.sha256(raw).hexdigest(),
                dataset_id=record['dataset_id'], version=record['version'], data_kind=record['data_kind'],
                source_variable=record['value_column'].removeprefix('mean_'),
                provenance=record.get('provenance', 'source_export'),
                temporal_coverage=[str(series.index[0].date()), str(series.index[-1].date())],
                latest_record=latest_record(series),
                finite_months=int(series.notna().sum()), monthly_slots=len(series),
                requested_bbox=[float(v) for v in requested.split(',')] if requested else None,
                data_bbox=[float(v) for v in data_box.split(',')] if data_box else None,
                spatial_support=record['spatial_support'], limitations=warnings)
            for box in (meta.requested_bbox, meta.data_bbox):
                if box is not None and (len(box) != 4 or not all(np.isfinite(box))):
                    raise ValueError('Invalid source bounding box')
            return meta, series
        except (OSError, ValueError, KeyError, TypeError, StopIteration, IndexError, UnicodeError) as exc:
            raise DataUnavailable('Cannot read prepared CSV dataset; check its manifest, dates and source values') from exc
