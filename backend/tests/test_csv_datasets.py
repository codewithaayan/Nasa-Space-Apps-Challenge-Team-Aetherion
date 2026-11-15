import hashlib
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

SOURCES = Path(__file__).resolve().parents[2] / 'Data' / 'Karachi'


@pytest.fixture
def csv_client(monkeypatch):
    monkeypatch.setenv('CSV_DATA_ROOT', str(SOURCES))
    with TestClient(app) as client:
        yield client


def test_catalog_preserves_units_coverage_and_provenance(csv_client):
    response = csv_client.get('/datasets')
    assert response.status_code == 200
    datasets = {d['topic']: d for d in response.json()}
    assert len(datasets) == 6
    assert datasets['temperature']['units'] == 'K'
    assert datasets['precipitation']['units'] == 'inch/day'
    assert datasets['evaporation']['units'] == 'kg m-2 s-1'
    assert datasets['soil_moisture']['units'] == 'kg m-2'
    assert datasets['precipitation']['temporal_coverage'][-1] == '2025-01-01'
    assert datasets['precipitation']['monthly_slots'] == 229
    assert datasets['soil_moisture']['data_kind'] == 'model'
    assert datasets['temperature']['data_kind'] == 'reanalysis'
    assert datasets['ndvi']['requested_bbox'] is None
    assert datasets['ndvi']['data_bbox'] is None
    assert all(not d['spatial_analysis_available'] for d in datasets.values())
    assert all(d['provenance'] == 'source_export' and d['scientific_review'] == 'unreviewed'
               for d in datasets.values())
    assert any('conflicts' in w for w in datasets['temperature']['limitations'])
    assert csv_client.get('/datasets?location=lahore').json() == []


@pytest.mark.parametrize('topic,months', [('temperature', 240), ('precipitation', 229),
    ('evaporation', 240), ('soil_moisture', 240), ('ndvi', 240), ('aerosols', 240)])
def test_real_csv_analysis_without_source_mutation(csv_client, topic, months):
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCES.glob('*.csv')}
    response = csv_client.get(f'/datasets/karachi_{topic}/analysis')
    assert response.status_code == 200, response.text
    result = response.json()
    assert len(result['series']) == months
    assert result['trend']['samples'] == months
    assert len(result['trend']['deseasonalized']) == months
    assert len(result['trend']['trend_line']) == months
    assert result['dataset']['units'] in result['trend']['slope_units']
    assert 'path' not in result['dataset']
    assert result['dataset']['source_sha256'] == before[result['dataset']['source_file']]
    assert result['warnings'] and result['summary']
    assert result['trend']['warnings'] == result['warnings']
    if topic == 'temperature':
        assert result['series'][0]['value'] == pytest.approx(292.143097)
    assert before == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCES.glob('*.csv')}


def test_short_selection_returns_source_values_without_fabricated_inference(csv_client):
    result = csv_client.get('/datasets/karachi_temperature/analysis',
        params={'start': '2006-01-31', 'end': '2006-12-15'}).json()
    assert len(result['series']) == 12
    assert result['trend'] is None
    assert any('60 finite months' in w for w in result['warnings'])


@pytest.mark.parametrize('params', [
    {'start': '2000-01-01'}, {'end': '2026-01-01'},
    {'start': '2010-01-01', 'end': '2009-01-01'}, {'start': 'not-a-date'}])
def test_bad_ranges_are_rejected(csv_client, params):
    assert csv_client.get('/datasets/karachi_temperature/analysis', params=params).status_code == 422


def test_unknown_dataset_and_legacy_route_isolation(csv_client, tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_ROOT', str(tmp_path))
    monkeypatch.delenv('MOCK_DATA', raising=False)
    assert csv_client.get('/datasets/not_registered/analysis').status_code == 404
    assert csv_client.get('/variables').json() == []
    assert csv_client.get('/demo/karachi').status_code == 404


def copied_sources(tmp_path, monkeypatch):
    root = tmp_path / 'sources'
    shutil.copytree(SOURCES, root)
    monkeypatch.setenv('CSV_DATA_ROOT', str(root))
    return root


def test_missing_month_and_fill_flags_are_not_interpolated(csv_client, tmp_path, monkeypatch):
    root = copied_sources(tmp_path, monkeypatch)
    path = root / 'Air_Temp_Karachi.csv'
    lines = path.read_text(encoding='utf-8').splitlines()
    lines = [line for line in lines if not line.startswith('2006-02-01 ')]
    lines = [line.split(',')[0] + ',1000000000000000' if line.startswith('2006-03-01 ') else line for line in lines]
    path.write_text('\n'.join(lines), encoding='utf-8')
    result = csv_client.get('/datasets/karachi_temperature/analysis').json()
    assert result['series'][1]['value'] is None
    assert result['series'][2]['value'] is None
    assert result['dataset']['finite_months'] == 238
    assert result['dataset']['monthly_slots'] == 240
    assert any('independence' in method for method in result['trend']['methods'].values())


def test_duplicate_months_and_unsafe_paths_fail_safely(csv_client, tmp_path, monkeypatch):
    root = copied_sources(tmp_path, monkeypatch)
    path = root / 'Air_Temp_Karachi.csv'
    original = path.read_bytes()
    path.write_bytes(original + b'\n2006-01-01 00:00:00,300\n')
    response = csv_client.get('/datasets/karachi_temperature/analysis')
    assert response.status_code == 503
    assert str(root) not in response.text
    path.write_bytes(original)
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    manifest['datasets'][0]['file'] = '../SECRET_INTERNAL.csv'
    (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
    response = csv_client.get('/datasets/karachi_temperature/analysis')
    assert response.status_code == 503
    assert 'SECRET_INTERNAL' not in response.text
