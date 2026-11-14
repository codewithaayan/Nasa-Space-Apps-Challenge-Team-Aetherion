import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

import numpy as np
import xarray as xr


def hashes(root):
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.is_file()}


def main():
    parser=argparse.ArgumentParser(description='Verify the external Sahel package without writing into it')
    parser.add_argument('--data-root',type=Path,required=True)
    args=parser.parse_args()
    root=args.data_root.resolve()
    before=hashes(root)
    provenance=json.loads((root/'provenance.json').read_text())
    for name,expected in provenance['sha256'].items():
        assert before[name]==expected, f'Provenance hash mismatch: {name}'
    with xr.open_dataset(root/'sahel_monthly_2001_2024.nc') as ds:
        assert dict(ds.sizes)=={'time':288,'latitude':11,'longitude':9}
        assert np.isfinite(ds.precipitation_amount.values).all()
        np.testing.assert_allclose(ds.precipitation_amount,
            ds.PRECTOTCORR*ds.time.dt.days_in_month,rtol=1e-12,atol=1e-12)
    backend=Path(__file__).resolve().parents[1]
    env=dict(os.environ,DATA_ROOT=str(root),MOCK_DATA='false',
             CATALOG_METADATA=str(backend/'config/sahel_metadata.json'))
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    with tempfile.TemporaryFile(mode='w+') as log:
        process=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1',
            '--port',str(port)],cwd=backend,env=env,stdout=log,stderr=log,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        def request(route):
            started=time.perf_counter()
            with urlopen(f'http://127.0.0.1:{port}'+route,timeout=60) as response:
                assert response.status==200
                data=json.load(response)
            return data,round(time.perf_counter()-started,6)
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError('Sahel verification server exited')
                try:
                    health,_=request('/health')
                    assert health=={'status':'ok'}
                    break
                except (URLError,TimeoutError):
                    time.sleep(.25)
            else:
                raise RuntimeError('Sahel startup timed out')
            output={}
            timing={}
            query='?var=sahel_precipitation&bbox=-5,12,0,17&start=2001-01-01&end=2024-12-31'
            for endpoint in ('variables','timeseries','trend','paradox'):
                output[endpoint],timing[endpoint]=request('/'+endpoint+(query if endpoint!='variables' else ''))
            variable=next(v for v in output['variables'] if v['id']=='sahel_precipitation')
            assert variable['data_kind']=='reanalysis' and variable['variable_type']=='monthly_amount'
            assert variable['units']=='mm' and 'path' not in variable
            chart=output['timeseries']
            assert len(chart['series'])==len(chart['deseasonalized'])==len(chart['trend_line'])==288
            assert chart['series'][0]['time']=='2001-01' and chart['series'][-1]['time']=='2024-12'
            assert chart['analysis_available'] and all(p['value'] is not None for p in chart['series'])
            grid=output['paradox']
            assert len(grid['cells'])==99 and all(c['valid_years']==24 for c in grid['cells'])
            assert len(grid['labels'])==11 and all(len(row)==9 for row in grid['labels'])
            assert not grid['opposing_trends'], 'Unexpected opposing-trend result: stop and review methods'
            counts={str(label):sum(c['label']==label for c in grid['cells']) for label in (-1,0,1,None)}
            result=output['trend']['result']
            report=dict(data_label='NASA POWER / MERRA-2 reanalysis',
                http_status={k:200 for k in output},timings_seconds=timing,
                months=288,cells=99,complete_years_per_cell=24,
                valid_cells=grid['valid_cells'],label_counts=counts,
                opposing_trends=grid['opposing_trends'],
                trend={k:result[k] for k in ('slope','slope_units','ci_low','ci_high','p_value','direction')},
                annual_slope_units=grid['slope_units'],
                cell_warnings=[{'latitude':c['latitude'],'longitude':c['longitude'],'warning':c['warning']}
                               for c in grid['cells'] if c['warning']],
                sha256=provenance['sha256'],
                limitations=['Monthly-amount slope is not annual-total slope.',
                             'This subset did not show statistically supported opposing trends.'])
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=15)
            assert hashes(root)==before, 'External package changed during verification'
        report['package_unchanged']=True
        report_path=backend/'reports/sahel_integration.json'
        report_path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
