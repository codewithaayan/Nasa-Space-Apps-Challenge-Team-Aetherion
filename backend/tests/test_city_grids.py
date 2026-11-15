import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr
from fastapi.testclient import TestClient
from app.main import app

from app.services.data import LocalDataSource
from app.services.evidence_length import evidence_length
from app.services.investigations import Investigations


ROOT = Path(__file__).resolve().parents[2] / 'Data' / 'CityGrids'


def test_nasa_originals_and_monthly_conversion():
    provenance = json.loads((ROOT / 'provenance.json').read_text())
    assert len(provenance['datasets']) == 12
    for record in provenance['datasets']:
        assert record['request_url'].startswith('https://power.larc.nasa.gov/api/')
        assert record['source_institution'] == 'NASA Langley Research Center (LaRC)'
        for field in ('original', 'prepared'):
            assert hashlib.sha256((ROOT / record[field + '_file']).read_bytes()).hexdigest() == record[field + '_sha256']
        with xr.open_dataset(ROOT / record['original_file']) as original, xr.open_dataset(ROOT / record['prepared_file']) as prepared:
            parameter = 'T2M' if record['id'].endswith('temperature') else 'PRECTOTCORR'
            codes = original.time.values.astype(int)
            source = original[parameter].isel(time=np.flatnonzero(codes % 100 <= 12)).values
            target = prepared[next(iter(prepared.data_vars))]
            assert target.sizes['time'] == 540
            assert target.sizes['latitude'] * target.sizes['longitude'] == record['cells']
            assert bool(np.isfinite(target).all())
            if parameter == 'PRECTOTCORR':
                source = source * prepared.time.dt.days_in_month.values[:, None, None]
            np.testing.assert_allclose(target.values, source)


def test_default_catalog_preserves_csvs_and_sahel_and_adds_city_grids(monkeypatch, tmp_path):
    monkeypatch.delenv('DATA_ROOT', raising=False)
    monkeypatch.delenv('CSV_DATA_ROOT', raising=False)
    catalog = Investigations().catalog()
    assert len([d for d in catalog if d.id.startswith('grid__power_')]) == 12
    assert any(d.id == 'karachi_temperature' for d in catalog)
    assert any(d.id == 'grid__sahel_precipitation' for d in catalog)
    with TestClient(app) as client:
        wizard = client.post('/api/wizard', json={'location': 'karachi', 'topic': 'temperature'}).json()
        assert wizard['selection']['dataset_id'] == 'grid__power_karachi_temperature'
    meta, array = LocalDataSource().load('power_karachi_temperature', [66, 23, 68, 26])
    assert array.shape == (540, 4, 3)
    assert meta.data_kind == 'reanalysis'
    monkeypatch.setenv('DATA_ROOT', str(tmp_path))
    assert LocalDataSource().catalog() == []  # Explicit external roots stay isolated.


def monthly(values):
    return pd.Series(np.repeat(values, 12), index=pd.date_range('1981-01-01', periods=12*len(values), freq='MS'))


def test_history_is_retrospective_and_requires_complete_years():
    assert not evidence_length(monthly(np.arange(9))).historical_prefixes
    flat = evidence_length(monthly(np.ones(20)))
    assert flat.estimate_years is None
    assert flat.historical_years_to_significance is None
    assert all(p.adjusted_p_value == 1 for p in flat.historical_prefixes)
    increasing = evidence_length(monthly(np.arange(20)))
    assert increasing.historical_years_to_significance is not None
    assert increasing.observed_complete_years == 20
    assert increasing.historical_prefixes[-1].end_year == 2000
    missing = monthly(np.arange(20)).drop(pd.Timestamp('1986-01-01'))
    history = evidence_length(missing)
    assert history.observed_complete_years == 19
    assert all(p.p_value is None and 'Nonconsecutive' in p.warning for p in history.historical_prefixes)


def test_prefix_multiple_testing_correction(monkeypatch):
    from app.services import evidence_length as module
    probabilities = iter([.001, .02, .5])
    monkeypatch.setattr(module, 'significance', lambda _: (next(probabilities), None))
    result = module.evidence_length(monthly(np.arange(12)))
    np.testing.assert_allclose([p.adjusted_p_value for p in result.historical_prefixes], [.0055, .055, 11/12])
    assert [p.significant for p in result.historical_prefixes] == [True, False, False]
