"""Download small, reproducible NASA POWER regional grids; never alter city CSVs."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

import numpy as np
import pandas as pd
import xarray as xr

CITIES = {'karachi': (24.8607, 67.0011), 'lahore': (31.5204, 74.3587),
          'islamabad': (33.6844, 73.0479), 'quetta': (30.1798, 66.975),
          'peshawar': (34.0151, 71.5249), 'gilgit': (35.9208, 74.308)}
PARAMETERS = {'temperature': 'T2M', 'precipitation': 'PRECTOTCORR'}


def prepare(root, *, download=False):
    root = Path(root).resolve()
    (root / 'original').mkdir(parents=True, exist_ok=True)
    requests = []
    for city, (lat, lon) in CITIES.items():
        for topic, parameter in PARAMETERS.items():
            box = [round(lon-1, 4), round(lat-1, 4), round(lon+1, 4), round(lat+1, 4)]
            query = {'latitude-min': box[1], 'latitude-max': box[3],
                     'longitude-min': box[0], 'longitude-max': box[2],
                     'parameters': parameter, 'community': 'AG', 'start': 1981,
                     'end': 2025, 'format': 'NETCDF'}
            url = 'https://power.larc.nasa.gov/api/temporal/monthly/regional?' + urllib.parse.urlencode(query)
            requests.append((city, topic, parameter, box, url))

    def acquire(item):
        city, topic, _, _, url = item
        path = root / 'original' / f'{city}_{topic}.nc'
        if path.exists():
            return
        if not download:
            raise ValueError(f'Missing original {path.name}; download explicitly')
        with urllib.request.urlopen(url, timeout=180) as response:
            body = response.read()
        # Validate format and monthly coordinates before retaining source bytes.
        temporary = path.with_suffix('.download')
        temporary.write_bytes(body)
        with xr.open_dataset(temporary, engine='h5netcdf') as ds:
            assert 'time' in ds
        temporary.replace(path)
        print(f'Downloaded NASA {city}/{topic}: {len(body)} bytes', flush=True)

    # Respect the service: at most two concurrent downloads, never one per cell.
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(acquire, requests))
    variables, evidence = [], []
    expected = pd.date_range('1981-01-01', '2025-12-01', freq='MS')
    for city, topic, parameter, box, url in requests:
        raw = root / 'original' / f'{city}_{topic}.nc'
        with xr.open_dataset(raw) as original:
            ds = original.load()
        codes = ds.time.values.astype(int)
        keep = (codes % 100 >= 1) & (codes % 100 <= 12)
        ds = ds.isel(time=np.flatnonzero(keep))
        dates = pd.to_datetime(ds.time.values.astype(str), format='%Y%m')
        if not dates.equals(expected):
            raise ValueError(f'{city}/{topic}: incomplete or unexpected dates')
        ds = ds.assign_coords(time=dates).rename({'lat': 'latitude', 'lon': 'longitude'})
        values = ds[parameter].where(ds[parameter] != -999)
        if not bool(np.isfinite(values).all()):
            raise ValueError(f'{city}/{topic}: missing values; review before registration')
        cells = values.sizes['latitude'] * values.sizes['longitude']
        if not 2 <= cells <= 100:
            raise ValueError('Expected 2–100 actual native cells, no resampling')
        if topic == 'precipitation':
            assert values.attrs['units'] == 'mm/day'
            assert bool((values >= 0).all())
            values = values * ds.time.dt.days_in_month
            units, aggregation, kind = 'mm', 'sum', 'monthly_amount'
            definition = 'NASA mean daily rate multiplied by actual Gregorian days in each month'
        else:
            if values.attrs['units'] not in ('C', 'degC'):
                raise ValueError('Unexpected NASA temperature units; no implicit conversion')
            units, aggregation, kind = values.attrs['units'], 'mean', 'state'
            definition = 'NASA monthly 2-metre air temperature, original Celsius values'
        field = 'precipitation_amount' if topic == 'precipitation' else 'temperature'
        values.attrs = {'units': units, 'long_name': definition}
        prepared = xr.Dataset({field: values}, attrs={**ds.attrs,
            'source_request': url, 'spatial_processing': 'No interpolation, duplication or spatial resampling',
            'preparation': 'Removed YYYY13 annual summaries; decoded Gregorian months. ' + definition,
            'region_scope': f'{city.title()} and surroundings, two-degree request window; not municipal boundaries'})
        filename = f'{city}_{topic}_1981_2025.nc'
        output = root / filename
        if output.exists():
            with xr.open_dataset(output) as installed:
                xr.testing.assert_equal(installed[field].load(), values)
        else:
            prepared.to_netcdf(output, engine='h5netcdf')
        limitations = [
            'NASA POWER / MERRA-2 reanalysis, not direct city station measurements.',
            'Two-degree city-and-surroundings window, not a municipal boundary or urban heat-island study.',
            'Coarse native 0.5 latitude by 0.625 longitude degree cells; no artificial finer resolution.',
            'No land mask; coastal windows can include sea and mountain windows mix elevations.',
            'The selected time span and spatial support affect results; scientific review remains pending.']
        if topic == 'precipitation':
            limitations.append('Monthly amounts derive from rounded NASA mm/day rates and actual month lengths; map slopes use annual sums.')
        record = dict(id=f'power_{city}_{topic}', location_id=city, topic=topic,
            name=f'{city.title()} region {"air temperature" if topic == "temperature" else "monthly rainfall"}',
            units=units, provenance='observations', data_kind='reanalysis',
            source='NASA POWER / MERRA-2 regional monthly reanalysis', source_url=url,
            dataset_id=f'NASA POWER MERRA-2 {parameter}', version=ds.attrs.get('version'),
            path=filename, field=field, annual_aggregation=aggregation, variable_type=kind,
            scientific_name=definition, temporal_coverage=['1981-01-01','2025-12-01'],
            spatial_resolution={'latitude_degrees': .5, 'longitude_degrees': .625},
            spatial_support=f'{city.title()} and surroundings; requested west/south/east/north {box}; {cells} native cell centres. Not city-only data.',
            limitations=limitations)
        variables.append(record)
        evidence.append(dict(id=record['id'], request_url=url, source_institution=ds.attrs.get('institution'),
            version=ds.attrs.get('version'), months=len(dates), years=45, cells=cells,
            requested_bbox=box, latitude=ds.latitude.values.tolist(), longitude=ds.longitude.values.tolist(),
            source_units=ds[parameter].attrs.get('units'), units=units,
            minimum=float(values.min()), maximum=float(values.max()), missing=0,
            original_file=raw.relative_to(root).as_posix(), prepared_file=filename,
            original_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
            prepared_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
            annual_records_removed=int((~keep).sum()), derivation=definition))
        print(f'Prepared {city}/{topic}: 540 months x {cells} native cells', flush=True)
    catalog = {'variables': variables}
    catalog_path = root / 'catalog.json'
    if catalog_path.exists() and json.loads(catalog_path.read_text()) != catalog:
        raise ValueError('Existing catalog differs; review instead of overwriting')
    catalog_path.write_text(json.dumps(catalog, indent=2) + '\n', encoding='utf-8')
    provenance_path = root / 'provenance.json'
    if not provenance_path.exists():
        provenance_path.write_text(json.dumps({'retrieved_utc': datetime.now(timezone.utc).isoformat(),
            'documentation': 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/',
            'datasets': evidence}, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'Data' / 'CityGrids')
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    prepare(args.output, download=args.download)
