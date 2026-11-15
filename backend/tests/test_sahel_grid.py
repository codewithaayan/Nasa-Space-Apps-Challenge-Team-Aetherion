"""Offline regression for the retained real NASA grid and deployment defaults."""
import hashlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.data import data_root

SAHEL = Path(__file__).resolve().parents[2] / 'Data' / 'Sahel'


@pytest.fixture
def sahel_client(monkeypatch):
    monkeypatch.delenv('DATA_ROOT', raising=False)
    monkeypatch.delenv('CATALOG_METADATA', raising=False)
    monkeypatch.delenv('CSV_DATA_ROOT', raising=False)
    monkeypatch.setenv('MOCK_DATA', 'false')
    with TestClient(app) as client:
        yield client


def test_bundled_grid_hashes_and_default_catalog(sahel_client):
    provenance = json.loads((SAHEL / 'provenance.json').read_text())
    for name, expected in provenance['sha256'].items():
        assert hashlib.sha256((SAHEL / name).read_bytes()).hexdigest() == expected
    assert data_root() == SAHEL.resolve()
    response = sahel_client.get('/api/datasets')
    assert response.status_code == 200
    catalog = response.json()
    assert len([d for d in catalog if d['storage_format'] == 'csv']) == 36
    grid = next(d for d in catalog if d['id'] == 'grid__sahel_precipitation')
    assert grid['location_id'] == 'sahel'
    assert grid['topic'] == 'precipitation'
    assert grid['data_kind'] == 'reanalysis'
    assert grid['storage_format'] == 'netcdf'
    assert grid['spatial_analysis_available']
    assert grid['monthly_slots'] == 288


def test_sahel_analysis_keeps_cells_when_paradox_is_false(sahel_client):
    wizard = sahel_client.post('/api/wizard', json={'location': 'sahel', 'topic': 'precipitation'})
    assert wizard.status_code == 200 and wizard.json()['available']
    assert wizard.json()['selection']['dataset_id'] == 'grid__sahel_precipitation'
    response = sahel_client.get('/api/datasets/grid__sahel_precipitation/analysis')
    assert response.status_code == 200, response.text
    analysis = response.json()
    spatial = analysis['paradox']
    assert len(analysis['series']) == 288
    assert analysis['feature_status']['paradox']['available']
    assert spatial['opposing_trends'] is False
    assert len(spatial['cells']) == 99
    assert spatial['valid_cells'] == 97
    assert sum(c['label'] == 1 for c in spatial['cells']) == 36
    assert sum(c['label'] == -1 for c in spatial['cells']) == 0
    assert sum(c['label'] == 0 for c in spatial['cells']) == 61
    assert sum(c['label'] is None for c in spatial['cells']) == 2
    assert spatial['variable']['annual_aggregation'] == 'sum'
    assert spatial['variable']['units'] == 'mm'
    assert all(c['valid_years'] == 24 for c in spatial['cells'])
    direct = sahel_client.get('/api/paradox', params={
        'var': 'sahel_precipitation', 'bbox': ','.join(map(str, spatial['bbox']))})
    assert direct.status_code == 200
    assert direct.json() == spatial  # Both APIs share the actual statistical engine.
    city = sahel_client.get('/api/datasets/karachi_temperature/analysis',
                            params={'start': '2006-01-01', 'end': '2006-12-01'}).json()
    assert city['paradox'] is None
    assert not city['feature_status']['paradox']['available']


def test_explicit_data_root_stays_isolated(sahel_client, monkeypatch, tmp_path):
    monkeypatch.setenv('DATA_ROOT', str(tmp_path))
    assert data_root() == tmp_path
    assert sahel_client.get('/api/variables').json() == []
    assert all(d['storage_format'] == 'csv' for d in sahel_client.get('/api/datasets').json())
