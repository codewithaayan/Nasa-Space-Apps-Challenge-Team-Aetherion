"""Small integration fixture, not Rhido's production ingestion pipeline."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

import numpy as np
import pandas as pd
import xarray as xr

from app.services.data import data_root

URL = ('https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M'
       '&community=RE&longitude=20&latitude=70&format=JSON&start=2000&end=2019')
SAMPLE = Path(__file__).resolve().parents[1] / 'examples' / 'power_t2m_2000_2019.json'


def prepare(raw: bytes, root: Path):
    payload = json.loads(raw)
    header = payload['header']
    if header['sources'] != ['MERRA2'] or payload['parameters']['T2M']['units'] != 'C':
        raise ValueError('Unexpected source or units; inspect NASA response')
    records = payload['properties']['parameter']['T2M']
    # POWER includes YYYY13 annual summaries; these are NOT monthly observations.
    keys = sorted(k for k in records if len(k) == 6 and 1 <= int(k[4:]) <= 12)
    times = pd.to_datetime(keys, format='%Y%m')
    expected = pd.date_range('2000-01-01', '2019-12-01', freq='MS')
    if not times.equals(expected):
        raise ValueError('Unexpected sample time coverage')
    values = np.array([records[k] for k in keys], dtype=float)
    values[values == header['fill_value']] = np.nan
    lon, lat, _ = payload['geometry']['coordinates']
    if (lat, lon) != (70, 20):
        raise ValueError('Unexpected sample coordinates')
    dataset = xr.Dataset({'T2M': (('time','lat','lon'), values[:,None,None],
        {'units':'C', 'long_name':payload['parameters']['T2M']['longname']})},
        coords={'time': times, 'lat':[lat], 'lon':[lon]},
        attrs={'source':URL, 'source_sha256':hashlib.sha256(raw).hexdigest(),
               'history':'NASA POWER JSON to NetCDF; YYYY13 summaries excluded; fill values to NaN'})
    root.mkdir(parents=True, exist_ok=True)
    output = root / 'power_t2m_sample.nc'
    if output.exists():
        with xr.open_dataset(output) as existing:
            xr.testing.assert_equal(existing.load(), dataset)
    else:
        dataset.to_netcdf(output, engine='h5netcdf')
    meta = dict(id='power_t2m_sample', name='NASA POWER 2-m temperature: 70N, 20E sample',
        units='C', provenance='observations', data_kind='reanalysis',
        source='NASA POWER monthly API; MERRA-2 assimilation/reanalysis, not direct satellite observations',
        dataset_id='NASA POWER monthly point / MERRA2', version=header['api']['version'],
        source_url=URL, scientific_name='Temperature at 2 Meters (T2M)',
        variable_type='state', annual_aggregation='mean', path=output.name, field='T2M',
        temporal_coverage=['2000-01-01','2019-12-01'],
        spatial_resolution={'latitude_degrees':.5, 'longitude_degrees':.625},
        spatial_support='Single requested POWER point at 70N,20E; native meteorology resolution 0.5 x 0.625 degrees',
        limitations=['Single-point sample is not an Arctic regional assessment.',
                    'version records the POWER API version, not a granule revision.',
                    'Legacy provenance observations means genuine source data; data_kind specifies reanalysis.'])
    catalog_path = root / 'catalog.json'
    catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else {'variables':[]}
    previous = next((v for v in catalog['variables'] if v['id'] == meta['id']), None)
    if previous is not None and previous != meta:
        raise ValueError('Existing catalog entry differs; refusing to overwrite it')
    if previous is None:
        catalog['variables'].append(meta)
        catalog_path.write_text(json.dumps(catalog, indent=2) + '\n')
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Fetch NASA instead of the bundled real sample')
    args = parser.parse_args()
    if args.download:
        with urlopen(URL, timeout=45) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Sample exceeds 2MB limit')
    else:
        raw = SAMPLE.read_bytes()
    meta = prepare(raw, data_root())
    print(json.dumps({'variable':meta['id'], 'months':240, 'sha256':hashlib.sha256(raw).hexdigest(),
                      'source':URL, 'data_kind':'reanalysis'}, indent=2))


if __name__ == '__main__':
    main()
