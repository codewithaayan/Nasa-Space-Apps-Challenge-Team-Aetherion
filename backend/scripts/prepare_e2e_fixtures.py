"""Create explicitly synthetic browser-test fixtures under workspace work/ only."""
import argparse
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

from scripts.precompute_demo import prepare_case


def prepare(mode):
    root = Path(__file__).resolve().parents[2] / 'work' / 'e2e' / mode
    grid = root / 'grids'
    grid.mkdir(parents=True, exist_ok=True)
    dates = pd.date_range('2000-01-01', periods=120, freq='MS')
    values = 280 + np.arange(120.)[:, None, None] / 12 * np.array([[1, -1], [.5, -.5]])[None, :, :]
    xr.Dataset({'t': (('time', 'lat', 'lon'), values, {'units': 'K'})},
        coords={'time': dates, 'lat': [24.9, 25.0], 'lon': [67.0, 67.1]}).to_netcdf(grid / 'contract.nc', engine='h5netcdf')
    record = dict(id='contract_grid', name='Synthetic integration grid (NOT NASA)', units='K',
        path='contract.nc', field='t', provenance='mock', data_kind='synthetic',
        dataset_id='contract_fixture', version='1', location_id='region', topic='fixture_temperature',
        source='Deterministic synthetic contract fixture, NOT NASA observations')
    (grid / 'catalog.json').write_text(json.dumps({'variables': [record]}), encoding='utf-8')
    os.environ['DATA_ROOT'] = str(grid)
    prepared = prepare_case('arctic', 'contract_grid', [66.99, 24.89, 67.11, 25.01])
    prepared.message = 'Synthetic software-test fixture, NOT an Arctic finding. Scientific review has not occurred.'
    (grid / 'demos').mkdir(exist_ok=True)
    (grid / 'demos' / 'arctic.json').write_text(prepared.model_dump_json(), encoding='utf-8')
    if mode == 'comparison':
        csv = root / 'csv'
        csv.mkdir(exist_ok=True)
        records = []
        for city, sign in [('karachi', 1), ('lahore', -1)]:
            pd.DataFrame({'time': dates, 'value': 280 + sign * np.arange(120.) / 12}).to_csv(csv / f'{city}.csv', index=False)
            records.append(dict(id=f'{city}_temperature', location_id=city, topic='temperature',
                file=f'{city}.csv', time_column='time', value_column='value', name='Synthetic temperature (NOT NASA)',
                units='K', dataset_id='contract_fixture', version='1', data_kind='synthetic', provenance='mock',
                source='Synthetic software-test fixture, NOT NASA observations', spatial_support='Synthetic series; no physical location claim.'))
        (csv / 'manifest.json').write_text(json.dumps({'datasets': records}), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['real', 'comparison'])
    prepare(parser.parse_args().mode)
