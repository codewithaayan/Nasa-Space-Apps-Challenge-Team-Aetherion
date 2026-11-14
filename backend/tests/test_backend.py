import json

import numpy as np
import pandas as pd
import pytest
import xarray as xr
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import Variable
from app.services.data import DataUnavailable, LocalDataSource, NotFound
from app.services.geo import parse_bbox
from app.services.paradox import find_paradox
from app.services.statistics import analyze, monthly_series


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    monkeypatch.setenv('DATA_ROOT', str(tmp_path))
    monkeypatch.delenv('MOCK_DATA', raising=False)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def series(slope=1, years=15):
    t = np.arange(years*12)
    return pd.Series(280 + slope*t/12 + 4*np.sin(2*np.pi*t/12),
                     index=pd.date_range('2000-01-01', periods=len(t), freq='MS'))


@pytest.mark.parametrize('box', ['1,2,3', 'nan,0,10,20', '-181,0,0,10',
                                '0,20,10,0', '0,0,0,10', 'a,b,c,d'])
def test_bad_boxes(box):
    with pytest.raises(ValueError):
        parse_bbox(box)


@pytest.mark.parametrize('box', ['-180,-90,180,90', '170,-10,-170,10'])
def test_good_boxes(box):
    assert len(parse_bbox(box)) == 4


def test_health_docs_validation(client):
    assert client.get('/health').json() == {'status':'ok'}
    assert client.get('/docs').status_code == 200
    assert client.get('/timeseries').status_code == 422
    assert client.get('/trend', params={'var':'x','bbox':'bad'}).status_code == 422
    assert client.get('/variables').json() == []
    assert client.get('/timeseries', params={'var':'x','bbox':'0,0,10,10'}).status_code == 404
    assert client.get('/demo/sahel').json()['provenance'] == 'unavailable'
    assert client.get('/demo/unknown').status_code == 404


@pytest.mark.parametrize('slope', [1, -1, 0])
def test_recovery(slope):
    result = analyze(series(slope), 'K')
    assert result.slope == pytest.approx(slope*10, abs=1e-8)
    assert result.ci_low <= result.slope + 1e-8
    assert result.ci_high >= result.slope - 1e-8
    assert result.slope_units == 'K per decade'
    assert result.years == 15
    assert len(result.raw) == len(result.deseasonalized) == len(result.trend_line) == 180
    assert result.significant == (slope != 0)
    assert result.direction == ({1:'increasing', -1:'decreasing', 0:'no_significant_trend'}[slope])


def test_missing_observations():
    s = series()
    s.iloc[5] = np.nan
    result = analyze(s, 'K')
    assert result.raw[5].value is None
    assert result.coverage < 1
    assert any('not adjusted for autocorrelation' in w for w in result.warnings)
    s.iloc[:100] = np.nan
    with pytest.raises(ValueError, match='coverage'):
        analyze(s, 'K')


def test_gap_significance_withheld():
    s = series(years=20)
    s.iloc[60:72] = np.nan
    assert analyze(s, 'K').p_value is None


def test_invalid_series():
    s = series()
    for invalid in [s.iloc[::-1], pd.concat([s, s.iloc[:1]]), s.iloc[:12]]:
        with pytest.raises(ValueError):
            analyze(invalid, 'K')
    with pytest.raises(ValueError):
        analyze(s, '')
    s.iloc[0] = np.inf
    with pytest.raises(ValueError):
        monthly_series(s)


def write_dataset(root, missing=False):
    meta = dict(id='temperature', name='Test fixture', units='K',
                provenance='mock', source='Synthetic test fixture, NOT NASA',
                path='fixture.nc', field='t')
    (root/'catalog.json').write_text(json.dumps({'variables':[meta]}))
    if not missing:
        s = series()
        data = np.stack([s.values, 560-s.values], axis=-1)[:,None,:]
        ds = xr.Dataset({'t': (('time','lat','lon'), data, {'units':'K'})},
                        coords={'time':s.index, 'lat':[20], 'lon':[350, 10]})
        ds.to_netcdf(root/'fixture.nc', engine='h5netcdf')


def test_adapter_and_paradox(tmp_path):
    write_dataset(tmp_path)
    meta, da = LocalDataSource().load('temperature', [-20, 0, 20, 30])
    assert da.longitude.values.tolist() == [-10, 10]
    result = find_paradox(meta, da, [-20,0,20,30])
    assert result.opposing_trends
    assert {c.label for c in result.cells} == {-1,1}
    assert result.increasing_proportion == result.decreasing_proportion == .5
    with pytest.raises(NotFound):
        LocalDataSource().load('temperature', [30,0,40,30])


def test_missing_file(client, tmp_path):
    write_dataset(tmp_path, missing=True)
    assert client.get('/trend', params={'var':'temperature','bbox':'-20,0,20,30'}).status_code == 503


def test_mock_contract(client, monkeypatch):
    monkeypatch.setenv('MOCK_DATA','true')
    assert client.get('/variables').json()[0]['provenance'] == 'mock'
    params = {'var':'mock_temperature', 'bbox':'-180,-90,180,90'}
    for route in ['/timeseries', '/trend', '/paradox']:
        response = client.get(route, params=params)
        assert response.status_code == 200, response.text
        assert response.json()['variable']['provenance'] == 'mock'
    params.update(start='2010-01-01', end='2009-01-01')
    assert client.get('/timeseries', params=params).status_code == 422
    params.update(start='invalid')
    assert client.get('/timeseries', params=params).status_code == 422


def test_cors(client):
    r = client.options('/trend', headers={'Origin':'http://localhost:5173',
        'Access-Control-Request-Method':'GET'})
    assert r.headers['access-control-allow-origin'] == 'http://localhost:5173'
    r = client.options('/trend', headers={'Origin':'https://unapproved.example',
        'Access-Control-Request-Method':'GET'})
    assert 'access-control-allow-origin' not in r.headers


def test_normalization_and_limits():
    da = xr.DataArray(np.ones((24,2,3)), dims=('time','latitude','longitude'),
        coords={'time':pd.date_range('2000-01-01',periods=24,freq='MS'),
                'latitude':[20,-20], 'longitude':[170,180,190]})
    selected = LocalDataSource.select(da, [160,-30,-160,30], None,None)
    assert selected.latitude.values.tolist() == [-20,20]
    assert selected.sizes['longitude'] == 3
    selected = LocalDataSource.select(da, [-180,-90,180,90], '2001-01-31','2001-02-15')
    assert selected.sizes['time'] == 2
    big = da.reindex(latitude=np.arange(40))
    with pytest.raises(ValueError, match='limit'):
        LocalDataSource.select(big, [-180,-90,180,90], None,None)


def test_all_missing_and_invalid_cells(client, tmp_path):
    write_dataset(tmp_path)
    _, da = LocalDataSource().load('temperature', [-20,0,20,30])
    da[:] = np.nan
    from app.services.data import regional_series
    with pytest.raises(NotFound):
        regional_series(da)
    meta = Variable(id='x',name='x',units='K',source='fixture',provenance='mock')
    result = find_paradox(meta, da, [-20,0,20,30])
    assert result.valid_cells == 0
    assert all(c.label is None for c in result.cells)


def test_demo_validation(client, tmp_path):
    (tmp_path/'demos').mkdir()
    (tmp_path/'demos'/'amazon.json').write_text('{"available":true}')
    assert client.get('/demo/amazon').status_code == 503


def test_zarr_roundtrip(tmp_path, client):
    write_dataset(tmp_path)
    with xr.open_dataset(tmp_path/'fixture.nc') as ds:
        ds.to_zarr(tmp_path/'fixture.zarr', zarr_format=2)
    catalog = json.loads((tmp_path/'catalog.json').read_text())
    catalog['variables'][0]['path'] = 'fixture.zarr'
    (tmp_path/'catalog.json').write_text(json.dumps(catalog))
    r = client.get('/timeseries', params={'var':'temperature', 'bbox':'-20,0,20,30'})
    assert r.status_code == 200, r.text
    assert len(r.json()['series']) == 180


def test_units_mismatch_and_catalog_path(tmp_path):
    write_dataset(tmp_path)
    catalog = json.loads((tmp_path/'catalog.json').read_text())
    catalog['variables'][0]['units'] = 'degC'
    (tmp_path/'catalog.json').write_text(json.dumps(catalog))
    with pytest.raises(DataUnavailable, match='units'):
        LocalDataSource().load('temperature', [-20,0,20,30])
    catalog['variables'][0]['path'] = '../outside.nc'
    (tmp_path/'catalog.json').write_text(json.dumps(catalog))
    with pytest.raises(DataUnavailable, match='inside'):
        LocalDataSource().load('temperature', [-20,0,20,30])


def test_seeded_noise_ci():
    s = series()
    rng = np.random.default_rng(42)
    noise = rng.normal(0,.2,len(s))
    for i in range(1,len(noise)):
        noise[i] += .5*noise[i-1]
    result = analyze(s + noise, 'K')
    assert result.slope == pytest.approx(10, abs=.5)
    assert result.ci_low < result.ci_high
    assert 'block' in result.methods['ci']


def test_demo_loaded(client, tmp_path, monkeypatch):
    monkeypatch.setenv('MOCK_DATA','true')
    result = client.get('/paradox',params={'var':'mock_temperature','bbox':'-180,-90,180,90'}).json()
    (tmp_path/'demos').mkdir()
    payload = dict(case='arctic', available=True, provenance='mock', source='Synthetic test',
                   message='NOT NASA', result=result)
    (tmp_path/'demos'/'arctic.json').write_text(json.dumps(payload))
    r = client.get('/demo/arctic')
    assert r.status_code == 200
    assert r.json()['available'] is True
    assert r.json()['provenance'] == 'mock'
