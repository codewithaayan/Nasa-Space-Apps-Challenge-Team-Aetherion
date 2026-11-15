import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import xarray as xr
from fastapi.testclient import TestClient

from app.main import app
from scripts.precompute_demo import prepare_case


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_ROOT', str(tmp_path / 'grids'))
    monkeypatch.setenv('CSV_DATA_ROOT', str(Path(__file__).resolve().parents[2] / 'Data' / 'Karachi'))
    monkeypatch.delenv('MOCK_DATA', raising=False)
    with TestClient(app) as connection:
        yield connection


def test_same_origin_catalog_and_real_wizard(client):
    assert client.get('/api/health').json() == {'status': 'ok'}
    assert client.get('/api/datasets').json() == client.get('/datasets').json()
    response = client.post('/api/wizard', json={'location': 'karachi', 'topic': 'precipitation'})
    assert response.status_code == 200
    body = response.json()
    assert body['available']
    assert body['selection']['dataset_id'] == 'karachi_precipitation'
    assert body['selection']['end'] == '2025-01-01'
    assert not client.post('/api/wizard', json={'location': 'lahore'}).json()['available']
    assert client.post('/api/wizard', json={'end': '2026-01-01'}).status_code == 422
    assert client.post('/api/wizard', json={'start': '2020-01-01', 'end': '2010-01-01'}).status_code == 422
    assert client.post('/api/wizard', json={'dataset_id':'karachi_temperature','location':'lahore'}).status_code == 422
    assert client.post('/api/wizard', json={'question':'Unconfigured natural-language request'}).status_code == 422


def test_verdict_recomputes_authoritative_statistics_and_years_are_honest(client):
    selection = {'dataset_id': 'karachi_temperature'}
    analysis = client.get('/api/datasets/karachi_temperature/analysis').json()
    verdict = client.post('/api/verdict', json=selection)
    assert verdict.status_code == 200
    assert verdict.json()['verdict'] == analysis['summary']
    assert not verdict.json()['ai_generated']
    assert verdict.json()['provenance'] == 'source_export'
    assert verdict.json()['caveats'] == analysis['warnings']
    years = client.post('/api/years-to-significance', json=selection).json()
    assert years['estimate_years'] is None
    assert years['method'] and years['warnings']
    assert analysis['feature_status']['years_to_significance']['available']
    assert years['historical_prefixes']
    assert not analysis['feature_status']['paradox']['available']
    assert client.post('/api/verdict', json={**selection, 'p_value':0.00001}).status_code == 422


def test_missing_comparison_is_a_typed_prerequisite(client):
    result = client.post('/api/comparison', json={'topic': 'temperature', 'run': True}).json()
    assert not result['available'] and 'Lahore' in result['reason']
    assert result['left_dataset']['id'] == 'karachi_temperature'
    assert result['right'] is None and result['left'] is None


def write_city_fixture(root, incompatible=False):
    root.mkdir()
    records = []
    dates = pd.date_range('2000-01-01', periods=120, freq='MS')
    for city, sign in [('karachi', 1), ('lahore', -1)]:
        filename = f'{city}.csv'
        pd.DataFrame({'time': dates, 'value': 280 + sign * np.arange(120) / 12}).to_csv(root / filename, index=False)
        records.append(dict(id=city + '_temperature', location_id=city, topic='temperature',
            file=filename, time_column='time', value_column='value', name='Synthetic temperature',
            units='K' if city == 'karachi' or not incompatible else 'C', dataset_id='contract_fixture',
            version='1', data_kind='synthetic', provenance='mock', source='Synthetic contract fixture, NOT NASA',
            spatial_support='Synthetic time series; no physical location claim.'))
    (root / 'manifest.json').write_text(json.dumps({'datasets': records}), encoding='utf-8')


@pytest.mark.parametrize('incompatible', [False, True])
def test_comparison_compatibility_is_enforced_by_backend(client, tmp_path, monkeypatch, incompatible):
    root = tmp_path / 'csv'
    write_city_fixture(root, incompatible)
    monkeypatch.setenv('CSV_DATA_ROOT', str(root))
    ready = client.post('/api/comparison', json={}).json()
    assert ready['available'] == (not incompatible)
    assert ready['left'] is None
    if incompatible:
        assert 'matching' in ready['reason']
        return
    result = client.post('/api/comparison', json={'run': True}).json()
    assert result['left']['dataset']['provenance'] == result['right']['dataset']['provenance'] == 'mock'
    assert result['left']['trend']['slope'] == pytest.approx(10)
    assert result['right']['trend']['slope'] == pytest.approx(-10)
    assert result['start'] == '2000-01-01' and result['end'] == '2009-12-01'
    assert client.post('/api/comparison', json={'start': '1990-01-01', 'run': True}).status_code == 422


def write_grid(root):
    root.mkdir(parents=True, exist_ok=True)
    t = np.arange(120.)
    values = 280 + t[:, None, None] / 12 * np.array([[1, -1], [0.5, -0.5]])[None, :, :]
    source = xr.Dataset({'t': (('time', 'lat', 'lon'), values, {'units': 'K'})},
        coords={'time': pd.date_range('2000-01-01', periods=120, freq='MS'),
                'lat': [24.9, 25.0], 'lon': [67.0, 67.1]})
    source.to_netcdf(root / 'contract.nc', engine='h5netcdf')
    (root / 'catalog.json').write_text(json.dumps({'variables': [dict(
        id='contract_grid', name='Synthetic integration grid (NOT NASA)', units='K',
        path='contract.nc', field='t', provenance='mock', data_kind='synthetic',
        dataset_id='contract_fixture', version='1', location_id='region', topic='fixture_temperature',
        source='Deterministic synthetic contract fixture, NOT NASA observations')]}), encoding='utf-8')


def test_grid_catalog_map_and_selection_share_the_frontend_contract(client, tmp_path):
    root = tmp_path / 'grids'
    write_grid(root)
    datasets = client.get('/api/datasets').json()
    grid = next(d for d in datasets if d['id'] == 'grid__contract_grid')
    assert grid['storage_format'] == 'netcdf'
    assert grid['provenance'] == 'mock' and grid['data_kind'] == 'synthetic'
    assert grid['finite_months'] is None  # Coordinate count is not a finite-data count.
    assert grid['spatial_analysis_available']
    response = client.get('/api/datasets/grid__contract_grid/analysis')
    assert response.status_code == 200, response.text
    result = response.json()
    assert len(result['series']) == 120
    assert len(result['paradox']['cells']) == 4
    assert result['paradox']['opposing_trends']
    assert result['feature_status']['paradox']['available']
    assert any('Synthetic' in w for w in result['warnings'])
    point = client.get('/api/datasets/grid__contract_grid/analysis', params={'bbox': '66.99,24.89,67.01,24.91'}).json()
    assert point['paradox'] is None
    assert not point['feature_status']['paradox']['available']
    assert client.get('/api/datasets/grid__contract_grid/analysis', params={'bbox': 'bad'}).status_code == 422


def test_prepared_cases_are_discoverable_and_readable_offline(client, tmp_path):
    root = tmp_path / 'grids'
    write_grid(root)
    prepared = prepare_case('arctic', 'contract_grid', [66.99, 24.89, 67.11, 25.01])
    (root / 'demos').mkdir()
    (root / 'demos' / 'arctic.json').write_text(prepared.model_dump_json(), encoding='utf-8')
    cases = {case['id']: case for case in client.get('/api/cases').json()}
    assert set(cases) == {'sahel', 'arctic'}
    assert cases['arctic']['available'] and not cases['arctic']['validated']
    assert not cases['sahel']['available']
    assert client.get('/api/demo/arctic').json()['provenance'] == 'mock'
    (root / 'contract.nc').unlink()
    (root / 'catalog.json').unlink()
    assert client.get('/api/demo/arctic').json()['available']


def test_unknown_api_paths_do_not_return_a_frontend_document(client):
    response = client.get('/api/not-a-route')
    assert response.status_code == 404
    assert response.headers['content-type'].startswith('application/json')
    assert client.get('/lab').status_code in (200, 503)
    archive = client.get('/cases')
    if archive.status_code == 200:
        assert archive.headers['content-type'].startswith('text/html')
