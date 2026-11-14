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
import pandas as pd

from scripts.import_power_sample import URL


def main():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    environment=dict(os.environ,MOCK_DATA='false')
    with tempfile.TemporaryFile(mode='w+') as log:
        process=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1',
            '--port',str(port)],cwd=Path(__file__).resolve().parents[1],env=environment,
            stdout=log,stderr=log,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        base=f'http://127.0.0.1:{port}'
        def request(route):
            started=time.perf_counter()
            with urlopen(base+route,timeout=60) as response:
                payload=response.read()
                assert response.status==200
            return payload,round(time.perf_counter()-started,6)
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError('Server exited at startup')
                try:
                    health,_=request('/health')
                    assert json.loads(health)=={'status':'ok'}
                    break
                except (URLError,TimeoutError):
                    time.sleep(.25)
            else:
                raise RuntimeError('Server startup timed out')
            report={'source_url':URL,'data_kind':'reanalysis','synthetic':False,
                    'timings_seconds':{},'http_status':{}}
            query='?var=power_t2m_sample&bbox=19.9,69.9,20.1,70.1'
            outputs={}
            for name,route in [('health','/health'),('docs','/docs'),('variables','/variables'),
                ('trend_cold','/trend'+query),('trend_warm','/trend'+query),
                ('timeseries','/timeseries'+query),('paradox','/paradox'+query),('demo','/demo/arctic')]:
                body,elapsed=request(route)
                report['timings_seconds'][name]=elapsed
                report['http_status'][name]=200
                if name!='docs': outputs[name]=json.loads(body)
            chart=outputs['timeseries']
            result=outputs['trend_cold']['result']
            assert chart['variable']['data_kind']=='reanalysis'
            y=np.array([p['value'] for p in chart['deseasonalized']])
            manual=np.median([(y[j]-y[i])/((j-i)/12)*10
                              for i in range(len(y)) for j in range(i+1,len(y))])
            assert abs(manual-result['slope'])<1e-10
            raw=pd.Series([p['value'] for p in chart['series']],
                          index=pd.to_datetime([p['time'] for p in chart['series']]))
            annual=raw.groupby(raw.index.year).mean()
            ols=np.polyfit(annual.index.to_numpy()-annual.index[0],annual.to_numpy(),1)[0]*10
            report.update(months=len(y), units='degrees Celsius', trend=result,
                independent_pairwise_slope_per_decade=float(manual),
                annual_ols_slope_per_decade=float(ols),
                crosscheck='Independent pairwise median matches Theil-Sen; annual OLS is a sensitivity check, not identical estimator',
                limitations=chart['variable']['limitations'],
                grid_cells=outputs['paradox']['valid_cells'],
                opposing_trends=outputs['paradox']['opposing_trends'])
            # Full plotting arrays belong to prepared demos, not this compact evidence report.
            for field in ('raw','deseasonalized','trend_line'):
                report['trend'].pop(field)
            output=Path(__file__).resolve().parents[1]/'reports'/'real_pipeline.json'
            output.parent.mkdir(exist_ok=True)
            output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
            print(json.dumps(report,indent=2))
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=15)
            log.seek(0)
            if process.returncode not in (0,-15,1):
                print(log.read(),file=sys.stderr)


if __name__=='__main__':
    main()
