import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import xarray as xr
from fastapi.testclient import TestClient
from scipy.stats import false_discovery_control

from app.main import app
from app.models.schemas import Variable
from app.services.analysis_cache import cached_analyze, _analyze
from app.services.data import LocalDataSource, DataUnavailable
from app.services.paradox import find_paradox
from app.services.statistics import analyze, monthly_series, annual_values
from scripts.import_power_sample import SAMPLE, prepare
from scripts.precompute_demo import prepare_case


@pytest.fixture
def prepared(tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_ROOT',str(tmp_path))
    monkeypatch.delenv('MOCK_DATA',raising=False)
    prepare(SAMPLE.read_bytes(),tmp_path)
    return tmp_path


def test_real_nasa_end_to_end_and_independent_slope(prepared):
    with TestClient(app) as client:
        params={'var':'power_t2m_sample','bbox':'19.9,69.9,20.1,70.1'}
        chart=client.get('/timeseries',params=params)
        trend=client.get('/trend',params=params)
        assert chart.status_code == trend.status_code == 200
        c=chart.json()
        result=trend.json()['result']
        assert c['variable']['data_kind']=='reanalysis'
        assert c['variable']['provenance']=='observations'
        assert 'path' not in c['variable']
        assert len(c['series'])==len(c['deseasonalized'])==len(c['trend_line'])==240
        assert c['series'][0]['value']==pytest.approx(-2.84)
        y=np.array([p['value'] for p in c['deseasonalized']])
        pair_slopes=[(y[j]-y[i])/((j-i)/12)*10 for i in range(len(y)) for j in range(i+1,len(y))]
        assert np.median(pair_slopes)==pytest.approx(result['slope'],abs=1e-10)
        assert result['ci_low'] < result['ci_high']
        assert c['variable']['temporal_coverage']==['2000-01-01','2019-12-01']


def test_import_idempotent_and_preserves_catalog(prepared):
    prepare(SAMPLE.read_bytes(),prepared)
    assert len(json.loads((prepared/'catalog.json').read_text())['variables'])==1
    catalog=json.loads((prepared/'catalog.json').read_text())
    catalog['variables'][0]['name']='Teammate edit'
    (prepared/'catalog.json').write_text(json.dumps(catalog))
    with pytest.raises(ValueError,match='refusing'):
        prepare(SAMPLE.read_bytes(),prepared)
    assert 'Teammate edit' in (prepared/'catalog.json').read_text()


def test_precomputed_offline_case(prepared):
    result=prepare_case('arctic','power_t2m_sample',[19.9,69.9,20.1,70.1])
    assert not result.validated and result.validated_by is None
    assert result.timeseries and result.trend and result.paradox
    (prepared/'demos').mkdir()
    (prepared/'demos/arctic.json').write_text(result.model_dump_json())
    (prepared/'power_t2m_sample.nc').rename(prepared/'offline.nc')
    (prepared/'catalog.json').rename(prepared/'offline_catalog.json')
    with TestClient(app) as client:
        r=client.get('/demo/arctic')
        assert r.status_code==200
        assert r.json()['timeseries']['variable']['data_kind']=='reanalysis'


def test_cf_fill_value_decoding(prepared):
    ds=xr.Dataset({'test':(('time','lat','lon'),np.array([1,-999.,3])[:,None,None],{'units':'K'})},
        coords={'time':pd.date_range('2000-01-01',periods=3,freq='MS'),'lat':[0],'lon':[0]})
    ds['test'].encoding['_FillValue']=-999.
    ds.to_netcdf(prepared/'fill.nc',engine='h5netcdf')
    meta=dict(id='fill',name='fill',units='K',provenance='mock',source='fixture',path='fill.nc',field='test')
    (prepared/'catalog.json').write_text(json.dumps({'variables':[meta]}))
    _,da=LocalDataSource().load('fill',[-1,-1,1,1])
    assert np.isnan(da.values[1,0,0])


def test_cache_immutable_and_invalidated_by_values():
    s=pd.Series(np.arange(120.),index=pd.date_range('2000-01-01',periods=120,freq='MS'))
    a=cached_analyze(s,'K')
    a.warnings.append('mutated')
    b=cached_analyze(s,'K')
    assert 'mutated' not in b.warnings
    assert cached_analyze(s*2,'K').slope==pytest.approx(2*b.slope)
    assert _analyze.cache_info().maxsize==16


def test_short_chart_still_available(prepared):
    with TestClient(app) as client:
        r=client.get('/timeseries',params={'var':'power_t2m_sample','bbox':'19,69,21,71',
                                          'start':'2000-01-01','end':'2000-12-31'})
        assert r.status_code==200
        assert not r.json()['analysis_available']
        assert len(r.json()['series'])==12


@pytest.mark.parametrize('kind',['constant','seasonal','noise','outlier','negative','gaps','irregular'])
def test_scientific_cases(kind):
    t=np.arange(180)
    rng=np.random.default_rng(1234)
    base=np.full(180,280.)
    if kind=='seasonal': base+=3*np.sin(t*2*np.pi/12)
    if kind=='noise': base+=rng.normal(0,.3,180)
    if kind=='outlier':
        base+=t/12
        base[70]+=1e5
    if kind=='negative': base-=t/12
    s=pd.Series(base,index=pd.date_range('2000-01-01',periods=180,freq='MS'))
    if kind=='gaps': s=s.drop(s.index[10])
    if kind=='irregular': s.index=s.index+pd.to_timedelta(t%15,unit='D')
    result=analyze(s,'K')
    if kind in {'constant','seasonal','noise','gaps','irregular'}:
        assert not result.significant
    if kind=='outlier': assert result.slope==pytest.approx(10,abs=.1)
    if kind=='negative': assert result.direction=='decreasing'
    if kind=='gaps': assert result.raw[10].value is None


def test_numeric_time_rejected():
    da=xr.DataArray(np.ones((10,1,1)),dims=('time','latitude','longitude'),
        coords={'time':range(10),'latitude':[0],'longitude':[0]})
    with pytest.raises(ValueError,match='datetime'):
        LocalDataSource.select(da,[-1,-1,1,1],None,None)


def test_paradox_matrix_and_fdr(monkeypatch):
    probabilities=iter([.0001,.002,.04,.8])
    monkeypatch.setattr('app.services.paradox.significance',lambda annual:(next(probabilities),None))
    t=np.arange(180)
    values=np.stack([t,-t,t,-t],axis=-1).reshape(180,2,2)
    da=xr.DataArray(values,dims=('time','latitude','longitude'),
        coords={'time':pd.date_range('2000-01-01',periods=180,freq='MS'),
                'latitude':[-10,10],'longitude':[-20,20]})
    meta=Variable(id='x',name='x',units='K',source='fixture',provenance='mock')
    r=find_paradox(meta,da,[-30,-20,30,20])
    expected=false_discovery_control([.0001,.002,.04,.8],method='by')<.05
    assert [c.significant for c in r.cells]==expected.tolist()
    assert r.latitudes==[-10,10] and r.longitudes==[-20,20]
    assert r.labels==[[1,-1],[0,0]]
    assert r.opposing_trends


def test_annual_semantics():
    s=pd.Series(np.arange(24.),index=pd.period_range('2000-01',periods=24,freq='M'))
    assert annual_values(s,'sum').iloc[0]==66
    s.iloc[0]=np.nan
    assert annual_values(s).index.tolist()==[2001]


def test_no_internal_paths_in_errors(prepared, monkeypatch):
    def fail(*a,**k): raise OSError('SECRET_INTERNAL_PATH')
    monkeypatch.setattr(xr,'open_dataset',fail)
    with TestClient(app) as client:
        r=client.get('/trend',params={'var':'power_t2m_sample','bbox':'19,69,21,71'})
        assert r.status_code==503
        assert 'SECRET' not in r.text


def test_irregular_grid_rejected():
    da=xr.DataArray(np.ones((12,3,1)),dims=('time','latitude','longitude'),
        coords={'time':pd.date_range('2000-01-01',periods=12,freq='MS'),
                'latitude':[0,10,30],'longitude':[0]})
    with pytest.raises(ValueError,match='regular grid'):
        LocalDataSource.select(da,[-1,-1,1,40],None,None)


def test_paradox_threshold(monkeypatch):
    # One increasing cell out of 20 is insufficient, even if statistically supported.
    monkeypatch.setattr('app.services.paradox.significance',lambda annual:(.00001,None))
    values=np.arange(180.)[:,None,None]*np.ones((1,1,20))
    values[:,:,1:]*=-1
    da=xr.DataArray(values,dims=('time','latitude','longitude'),
        coords={'time':pd.date_range('2000-01-01',periods=180,freq='MS'),
                'latitude':[0],'longitude':np.arange(20)})
    meta=Variable(id='x',name='x',units='K',source='fixture',provenance='mock')
    r=find_paradox(meta,da,[-1,-1,21,1])
    assert r.increasing_proportion==.05
    assert not r.opposing_trends


def test_path_safety_absolute_and_symlink(prepared):
    catalog=json.loads((prepared/'catalog.json').read_text())
    catalog['variables'][0]['path']=str(prepared/'power_t2m_sample.nc')
    (prepared/'catalog.json').write_text(json.dumps(catalog))
    with pytest.raises(DataUnavailable,match='relative'):
        LocalDataSource().load('power_t2m_sample',[19,69,21,71])


def test_schema_rejects_nonfinite():
    from app.models.schemas import Point
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Point(time='2000-01',value=float('nan'))


def test_monthly_amount_contract(prepared):
    catalog=json.loads((prepared/'catalog.json').read_text())
    catalog['variables'][0]['annual_aggregation']='sum'
    catalog['variables'][0]['variable_type']='rate'
    (prepared/'catalog.json').write_text(json.dumps(catalog))
    with pytest.raises(DataUnavailable,match='monthly_amount'):
        LocalDataSource().load('power_t2m_sample',[19,69,21,71])


def test_positive_180_boundary():
    da=xr.DataArray(np.ones((12,1,3)),dims=('time','latitude','longitude'),
        coords={'time':pd.date_range('2000-01-01',periods=12,freq='MS'),
                'latitude':[0],'longitude':[170,180,190]})
    selected=LocalDataSource.select(da,[170,-1,180,1],None,None)
    assert set(selected.longitude.values)=={-180,170}
