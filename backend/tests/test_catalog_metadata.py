import json

import pytest

from app.services.data import LocalDataSource, DataUnavailable


@pytest.fixture
def catalog(tmp_path, monkeypatch):
    record=dict(id='rain',name='Rain',units='mm',provenance='observations',
                source='NASA POWER / MERRA-2 reanalysis',path='rain.nc',
                field='precipitation_amount',annual_aggregation='sum')
    (tmp_path/'catalog.json').write_text(json.dumps({'variables':[record]}))
    metadata=tmp_path/'metadata.json'
    monkeypatch.setenv('DATA_ROOT',str(tmp_path))
    monkeypatch.setenv('CATALOG_METADATA',str(metadata))
    return tmp_path,metadata


def test_metadata_read_only(catalog):
    root,path=catalog
    before=(root/'catalog.json').read_bytes()
    path.write_text(json.dumps({'rain':{'variable_type':'monthly_amount','data_kind':'reanalysis'}}))
    record=LocalDataSource().catalog()[0]
    assert record.variable_type=='monthly_amount'
    assert record.data_kind=='reanalysis'
    assert record.annual_aggregation=='sum'
    assert (root/'catalog.json').read_bytes()==before


@pytest.mark.parametrize('metadata',[
    {'rain':{'path':'outside.nc'}},
    {'rain':{'annual_aggregation':'mean'}},
    {'unknown':{'data_kind':'reanalysis'}},
    {'rain':{'data_kind':'invented'}}
])
def test_metadata_rejects_unsafe_or_invalid_changes(catalog,metadata):
    _,path=catalog
    path.write_text(json.dumps(metadata))
    with pytest.raises(DataUnavailable):
        LocalDataSource().catalog()


def test_metadata_rejects_conflicting_fields(catalog):
    root,path=catalog
    raw=json.loads((root/'catalog.json').read_text())
    raw['variables'][0]['variable_type']='rate'
    (root/'catalog.json').write_text(json.dumps(raw))
    path.write_text(json.dumps({'rain':{'variable_type':'monthly_amount'}}))
    with pytest.raises(DataUnavailable):
        LocalDataSource().catalog()
