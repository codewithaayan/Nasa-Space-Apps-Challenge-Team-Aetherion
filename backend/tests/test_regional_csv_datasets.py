"""Offline integration checks against all supplied city exports and their semantics."""
import hashlib
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).resolve().parents[2] / 'Data'
CITIES = ['karachi', 'lahore', 'gilgit', 'islamabad', 'peshawar', 'quetta']
TOPICS = ['temperature', 'precipitation', 'evaporation', 'soil_moisture', 'ndvi', 'aerosols']


@pytest.fixture
def regional_client(monkeypatch, tmp_path):
    monkeypatch.delenv('CSV_DATA_ROOT', raising=False)
    monkeypatch.setenv('DATA_ROOT', str(tmp_path / 'no_grids'))
    monkeypatch.delenv('MOCK_DATA', raising=False)
    with TestClient(app) as client:
        yield client


def test_default_catalog_discovers_every_registered_city(regional_client):
    response = regional_client.get('/api/datasets')
    assert response.status_code == 200, response.text
    catalog = response.json()
    assert len(catalog) == len({d['id'] for d in catalog}) == 36
    assert {d['location_id'] for d in catalog} == set(CITIES)
    for city in CITIES:
        datasets = regional_client.get('/api/datasets', params={'location': city}).json()
        assert {d['topic'] for d in datasets} == set(TOPICS)
        for dataset in datasets:
            assert dataset['source_variable']
            assert dataset['scientific_review'] == 'unreviewed'
            assert dataset['provenance'] == 'source_export'
            assert dataset['latest_record']['time'] == dataset['temporal_coverage'][-1][:7]
            assert not dataset['spatial_analysis_available']
            expected_months = (229 if city == 'karachi' else 237) if dataset['topic'] == 'precipitation' else 240
            assert dataset['monthly_slots'] == expected_months


@pytest.mark.parametrize('city', CITIES[1:])
@pytest.mark.parametrize('topic', TOPICS)
def test_each_new_export_supports_analysis_and_wizard_without_mutation(regional_client, city, topic):
    folder = ROOT / city.title()
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.glob('*.csv')}
    response = regional_client.get(f'/api/datasets/{city}_{topic}/analysis')
    assert response.status_code == 200, response.text
    analysis = response.json()
    dataset = analysis['dataset']
    months = 237 if topic == 'precipitation' else 240
    assert len(analysis['series']) == dataset['monthly_slots'] == months
    assert analysis['trend']['samples'] == dataset['finite_months']
    assert dataset['source_sha256'] == before[dataset['source_file']]
    assert dataset['latest_record'] == analysis['series'][-1]
    assert dataset['units'] in analysis['trend']['slope_units']
    assert analysis['verdict']['provenance'] == 'source_export'
    assert analysis['warnings'] and not analysis['feature_status']['paradox']['available']
    if topic == 'ndvi':
        assert dataset['requested_bbox'] is None and dataset['data_bbox'] is None
        assert any('geolocation is unverified' in warning for warning in analysis['warnings'])
    wizard = regional_client.post('/api/wizard', json={'location': city, 'topic': topic}).json()
    assert wizard['available'] and wizard['selection']['dataset_id'] == f'{city}_{topic}'
    assert wizard['selection']['end'] == ('2025-09-01' if topic == 'precipitation' else '2025-12-01')
    assert before == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.glob('*.csv')}


def test_units_soil_depth_and_evaporation_components_are_not_relabelled(regional_client):
    catalog = {d['id']: d for d in regional_client.get('/api/datasets').json()}
    assert catalog['karachi_precipitation']['units'] == 'mm/hr'
    assert catalog['karachi_precipitation']['source_units'] == 'inch/day'
    assert catalog['lahore_precipitation']['units'] == 'mm/hr'
    assert catalog['lahore_evaporation']['units'] == catalog['quetta_evaporation']['units'] == 'W m-2'
    assert catalog['gilgit_evaporation']['units'] == 'kg m-2 s-1'
    assert catalog['lahore_evaporation']['source_variable'].endswith('ESoil_tavg')
    assert catalog['quetta_evaporation']['source_variable'].endswith('ECanop_tavg')
    assert catalog['peshawar_evaporation']['source_variable'].endswith('Evap_tavg')
    assert '10–40 cm' in catalog['lahore_soil_moisture']['name']
    assert catalog['gilgit_temperature']['dataset_id'] == 'M2SMNXSLV'
    # Values retain their native magnitude rather than being converted to another unit.
    for dataset, expected in [('lahore_temperature', 285.582916), ('lahore_evaporation', 1.84008193),
                              ('quetta_evaporation', .0683765039), ('lahore_precipitation', .0443957187)]:
        result = regional_client.get(f'/api/datasets/{dataset}/analysis', params={'start': '2006-01-01', 'end': '2006-01-01'}).json()
        assert result['series'][0]['value'] == pytest.approx(expected)


@pytest.mark.parametrize('topic,left,right', [
    ('soil_moisture', 'karachi', 'lahore'),  # Same product and units, different depths.
    ('evaporation', 'lahore', 'quetta'),    # Same product and units, different components.
    ('temperature', 'karachi', 'gilgit'),  # Different MERRA-2 collections.
])
def test_incompatible_real_exports_cannot_be_compared(regional_client, topic, left, right):
    response = regional_client.post('/api/comparison', json={
        'topic': topic, 'left_location': left, 'right_location': right, 'run': True})
    assert response.status_code == 200, response.text
    result = response.json()
    assert not result['available'] and 'matching' in result['reason']
    assert result['left'] is None and result['right'] is None


@pytest.mark.parametrize('topic,left,right', [
    ('temperature', 'karachi', 'lahore'),
    ('temperature', 'gilgit', 'islamabad'),
    ('precipitation', 'lahore', 'peshawar'),
    ('precipitation', 'karachi', 'lahore'),
    ('soil_moisture', 'lahore', 'quetta'),
    ('evaporation', 'gilgit', 'peshawar'),
    ('aerosols', 'karachi', 'quetta'),
])
def test_compatible_real_exports_use_the_requested_cities_and_common_coverage(regional_client, topic, left, right):
    result = regional_client.post('/api/comparison', json={
        'topic': topic, 'left_location': left, 'right_location': right}).json()
    assert result['available']
    assert result['left_dataset']['id'] == f'{left}_{topic}'
    assert result['right_dataset']['id'] == f'{right}_{topic}'
    expected_end = ('2025-01-01' if 'karachi' in (left, right) else '2025-09-01') if topic == 'precipitation' else '2025-12-01'
    assert result['end'] == expected_end


def test_real_comparison_returns_both_analyses_and_rejects_same_city(regional_client):
    response = regional_client.post('/api/comparison', json={
        'topic': 'precipitation', 'left_location': 'karachi', 'right_location': 'lahore',
        'start': '2006-01-01', 'end': '2015-12-01', 'run': True})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['available'] and len(result['left']['series']) == len(result['right']['series']) == 120
    assert result['left']['dataset']['units'] == result['right']['dataset']['units'] == 'mm/hr'
    assert result['left']['dataset']['unit_conversion']['factor'] == pytest.approx(25.4 / 24)
    assert result['right']['dataset']['unit_conversion'] is None
    assert result['left']['series'][0]['value'] == pytest.approx(.000499147223 * 25.4 / 24)
    assert result['right']['series'][0]['value'] == pytest.approx(.0443957187)
    same = regional_client.post('/api/comparison', json={'left_location': 'lahore', 'right_location': 'lahore'}).json()
    assert not same['available'] and 'different locations' in same['reason']


@pytest.mark.parametrize('invalid', ['duplicate_id', 'sibling_path'])
def test_multi_manifest_roots_reject_duplicate_ids_and_cross_folder_paths(regional_client, tmp_path, monkeypatch, invalid):
    root = tmp_path / 'sources'
    for city in ['Karachi', 'Lahore']:
        shutil.copytree(ROOT / city, root / city)
    path = root / 'Lahore' / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if invalid == 'duplicate_id':
        manifest['datasets'][0]['id'] = 'karachi_temperature'
    else:
        manifest['datasets'][0]['file'] = '../Karachi/Air_Temp_Karachi.csv'
    path.write_text(json.dumps(manifest), encoding='utf-8')
    monkeypatch.setenv('CSV_DATA_ROOT', str(root))
    response = regional_client.get('/api/datasets')
    assert response.status_code == 503
    assert str(root) not in response.text
