# Western Sahel rainfall integration

Label all charts and maps **NASA POWER / MERRA-2 reanalysis**. This is a
bias-corrected model reanalysis, not direct station or satellite-only observations.
The western Sahel subset did not show statistically supported opposing trends.

The existing backend reads the external package directly. No shared catalog,
dataset or teammate ingestion file is replaced. `CATALOG_METADATA` supplies missing
scientific metadata from backend/config/sahel_metadata.json without writing to
the source catalog. It cannot replace paths, fields, units, aggregation rules or
conflicting existing metadata. Unset it when switching to a different catalog.

## Start from the permanent backend directory

```powershell
cd C:\Users\Abdullah\Desktop\Nasa-Space-Apps-Challenge-Team-Aetherion\backend
$env:DATA_ROOT = 'C:\Users\Abdullah\Documents\Codex\2026-11-14\referenced-chatgpt-conversation-this-is-an\outputs\nasa_sahel'
$env:CATALOG_METADATA = "$PWD\config\sahel_metadata.json"
$env:MOCK_DATA = 'false'
$env:ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Equivalent launcher: `powershell -NoProfile -ExecutionPolicy Bypass -File
.\scripts\start_sahel.ps1 -Port 8001` (one line). Execution policy applies only
to that process. If relocating data, pass `-DataRoot` to the launcher. No import,
rebuild, download, or edit of the delivered package is needed.

## Aayan: requests and plotting

Use http://127.0.0.1:8001 as the API base; /docs exposes full response schemas.

```javascript
const base = 'http://127.0.0.1:8001';
const query = new URLSearchParams({
  var: 'sahel_precipitation', bbox: '-5,12,0,17',
  start: '2001-01-01', end: '2024-12-31'
});
async function get(path) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error((await response.json()).detail);
  return response.json();
}
const variables = await get('/variables');
const chart = await get(`/timeseries?${query}`);
const trend = await get(`/trend?${query}`);
const grid = await get(`/paradox?${query}`);
```

- `chart.series` is the cosine-latitude-weighted regional mean monthly amount,
  in mm. Plot each `{time,value}` using YYYY-MM dates. Never sum across cells.
- `chart.deseasonalized` and `chart.trend_line` align to the same 288 months.
  Label them seasonally adjusted rainfall and fitted monthly-amount trend.
  These are not annual rainfall totals. Preserve null values as gaps.
- `trend.result` contains the monthly-amount slope in mm per decade, its CI,
  p-value, significance and warnings. Display method metadata and limitations.
- `grid.latitudes` (11) and `grid.longitudes` (9) index `grid.labels[row][column]`,
  `slopes` and `p_values`. All 99 cells must appear, including the two null labels.
- Labels: +1 supported increase, -1 supported decrease, 0 no significant trend,
  null significance unavailable. Zero does not prove stability; null is not zero.
- Map slopes are trends in complete annual TOTAL rainfall (mm per decade).
  They are different quantities from the trend endpoint's monthly-amount slope.
- `grid.valid_cells` counts testable cells (97), not total cells (99).
  Shares are cell fractions, not area percentages. `opposing_trends=false` must
  display “No statistically supported opposing trends detected in this subset.”
- The legacy `provenance=observations` category means genuine source data only;
  use `data_kind=reanalysis` and the source/name text for the scientific label.
- Development CORS allows localhost:5173 and 127.0.0.1:5173. Add an explicit
  origin through ALLOWED_ORIGINS if the frontend uses another host/port.

The original monthly mean daily rate (mm/day) was multiplied by actual Gregorian
days per month, including leap days, to create monthly amounts. Source rate
rounding remains. Do not sum mm/day rates or multiply the trend slope by 12 and
present it as the independently calculated annual-total slope.

## Verified result

Live Uvicorn requests against this backend, not the old NASA folder, returned 200
for /variables, /timeseries, /trend and /paradox. The check validated 288 monthly
records, 99 cells, 24 complete years in every cell, amount conversion and both
NetCDF SHA256 hashes against provenance.json. All external package files were
hash-checked unchanged after verification.

After autocorrelation-aware annual testing and Benjamini-Yekutieli FDR:
36 increasing, 0 decreasing, 61 without a significant trend, 2 untestable.
The two untestable cells have unstable Hamed-Rao variance corrections; their
inference is withheld rather than labeled stable. No paradox is claimed.
These are exploratory outputs requiring Waseel/Ayesha review, not causal evidence.

Reproduce without writing into the package:

```powershell
.\.venv\Scripts\python.exe -m scripts.verify_sahel --data-root $env:DATA_ROOT
```

Results are saved only to backend/reports/sahel_integration.json. The verification
server uses an available temporary port and is stopped afterward. Existing
servers are not stopped or reconfigured. Run portable backend tests separately:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
```

No /demo/sahel artifact is manufactured by this connection.
