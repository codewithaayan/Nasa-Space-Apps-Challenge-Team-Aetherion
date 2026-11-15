# Rosenzweig Index backend

## Regional CSV integration

The frontend now uses a shared CSV/grid contract under `/api`. See the
[complete integration contract](docs/INTEGRATION.md) for wizard, verdict,
comparison, cell maps, prepared cases, same-origin hosting and browser tests.
Root-level data routes remain available for existing clients.

Thirty-six supplied CSV exports are readable from six city manifests under
repository `Data/`: Karachi, Lahore, Gilgit, Islamabad, Peshawar and Quetta.
`CSV_DATA_ROOT` may point to another multi-city root or directly to a collection
with its own `manifest.json` (including the original `Data/Karachi`).
`GET /datasets` discovers actual coverage and provenance; optional `location`
filters the catalog. `GET /datasets/{id}/analysis` accepts optional ISO `start`
and `end` dates, returning source values, a nullable trend, deterministic summary,
and warnings. Short selections still return source values. Out-of-coverage or
reversed dates are invalid. The existing gridded API below remains unchanged.

No CSV is treated as a spatial grid. Precipitation is served in mm/hr for all
cities. Karachi source rates are converted from inch/day using 25.4 / 24 before
analysis; original bytes, source units and conversion metadata are preserved.
Other quantities retain their source units, including temperature in K.
Lahore bare-soil and Quetta canopy evaporation are energy fluxes in W m-2.
`source_variable` identifies the actual exported field; comparison requires it
to match, preventing different soil layers or evaporation components from being
compared just because their product and units match. Source conflicts and unverified NDVI
geolocation remain visible. See [CSV provenance and limitations](../Data/Karachi/README.md)
and the [future collection backlog](../Data/FUTURE_DATA_REQUIREMENTS.md).
`python -m scripts.verify_csv_pipeline` checks a running local backend, with an
optional `--base-url`. Offline tests cover all 36 real source-export pipelines. See [regional data notes](../Data/README.md).

Python 3.11–3.13 recommended. FastAPI serves synchronous scientific requests;
Bulk NASA ingestion, AI, frontend and deployment remain teammate-owned.
No team build guide was present in the checkout.

The current backend includes a reproducible genuine NASA POWER/MERRA-2 sample,
bounded analysis caching, expanded chart/map contracts and offline precomputation.
See [handoff and deployment notes](docs/HANDOFF.md), [catalog schema](docs/catalog.schema.json),
[working JSON examples](examples/api_responses.json) and [real-data evidence](reports/real_pipeline.json).
The sample is a single-point reanalysis check, not a validated Arctic case study.

## Windows PowerShell

From the repository root (activation is unnecessary; nothing installs globally):

```powershell
cd C:\Users\Abdullah\Desktop\Nasa-Space-Apps-Challenge-Team-Aetherion\backend
$env:DATA_ROOT = "$PWD\data"
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m scripts.import_power_sample
.\.venv\Scripts\python.exe -m pytest -q
$env:ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs or /health. Ctrl+C stops the server.
If port 8000 is already occupied (for example by the old checkout), append
`--port 8001` to the Uvicorn command and open http://127.0.0.1:8001/docs instead.
For an explicitly synthetic demonstration only, before starting:

```powershell
$env:MOCK_DATA = "true"
```

This supplies `mock_temperature` only when no catalog exists, on a small global
grid. It is NOT NASA data. Remove the environment variable to disable it:
`Remove-Item Env:MOCK_DATA`. No files are downloaded or written by the API.
Without a catalog `/variables` returns `[]`; unknown variables return 404.
The sample import above creates a real NASA POWER/MERRA-2 catalog from bundled
source data, without internet access. To use mock mode instead, point DATA_ROOT
to a separate empty directory before starting; it never silently replaces a catalog.

## Structure

- `app/main.py`: single FastAPI app, CORS and error handling.
- `app/api/`: HTTP routes and dependency injection boundary.
- `app/models/`: Pydantic JSON contracts.
- `app/services/data.py`: replaceable local data source, coordinate normalization and spatial averaging.
- `app/services/statistics.py`: monthly validation, seasonal adjustment, slope and significance.
- `app/services/paradox.py`: annual cell calculations and multiple testing.
- `tests/`: deterministic synthetic fixtures; no test implies NASA validation.
- `scripts/`: real sample import, dataset validation, offline precompute and live verification.
- `examples/`: genuine NASA POWER raw response and runnable API examples.
- `docs/HANDOFF.md`: teammate contracts, limitations and deployment checklist.
- `reports/real_pipeline.json`: actual live real-data evidence and measured timings.
- `data/` (local, ignored): Rhido's datasets/catalog and validated demo files.

## Rhido: data contract

Set `DATA_ROOT` to a local directory with `catalog.json`:

```json
{"variables":[{"id":"temperature","name":"Near-surface temperature","units":"K","provenance":"observations","source":"REPLACE with NASA product, version and citation","path":"temperature.nc","field":"t2m","annual_aggregation":"mean"}]}
```

Use `provenance: "mock"` for fixtures, `observations` only for real sourced data.
Metadata labels are supplied by the producer; the API cannot authenticate NASA provenance.
Paths must be relative and inside DATA_ROOT. NetCDF and `.zarr` stores are supported;
The `path` field is internal and is omitted from API responses.
Zarr dependencies are included. The loader uses xarray, loads only the selected
region, and closes datasets. Other adapters can implement `catalog()` and
`load(var, bbox, start, end) -> (Variable, DataArray)` and replace the `source`
FastAPI dependency without changing routes.

Each field must have exactly three dimensions: `time, latitude, longitude`;
`date, lat, lon` aliases normalize automatically. Use 1D rectilinear cell centers,
ascending or descending latitude, Gregorian datetime coordinates, one sample per
calendar month, numeric values, NaN missing records, and an explicit `units`
attribute matching the catalog exactly. Longitudes in [-180,180] or [0,360]
normalize to [-180,180); duplicate cyclic endpoints are rejected. Curvilinear,
extra level dimensions and non-Gregorian calendars need preprocessing by Rhido.

Subsetting selects cell centers, not fractional polygon intersections. Dateline
crossing boxes use west > east. Monthly means use cosine-latitude weights on a
regular latitude/longitude grid; this is not appropriate for irregular cell areas.
All-missing time slices remain null. Varying finite spatial coverage is disclosed;
Rhido should supply stable masks. No interpolation or unit conversion is applied.
Annual `mean` is an equal-month mean, suitable for monthly state variables.
Annual `sum` requires additive monthly amounts (e.g. mm accumulated per month);
convert rates and daily data upstream. Slash-form rate units are rejected for sums.

## Aayan: API contract

GET endpoints (no `/api` prefix):

| Endpoint | Response |
| --- | --- |
| `/health` | `{"status":"ok"}` |
| `/variables` | Array of Variable metadata |
| `/timeseries?var=...&bbox=west,south,east,north` | `{variable,bbox,spatial_method,series,deseasonalized,trend_line,analysis_available,coverage,warnings}` |
| `/trend?var=...&bbox=...` | `{variable,bbox,result:{direction,significant,p_value,slope,ci_low,ci_high,slope_units,years,samples,coverage,raw,deseasonalized,trend_line,methods,warnings}}` |
| `/paradox?var=...&bbox=...` | `{variable,bbox,cells,latitudes,longitudes,labels,slopes,p_values,opposing_trends,increasing_proportion,decreasing_proportion,valid_cells,slope_units,methods,warnings}` |
| `/demo/sahel`, `/demo/amazon`, `/demo/arctic` | Typed demo envelope; `available:false` until supplied |

All data routes accept optional ISO dates `start=2000-01-01&end=2019-12-31`.
Bounds are inclusive calendar months (day is ignored). Reversed dates are invalid.
Times are `YYYY-MM`; missing values serialize as JSON null. Do not connect chart
lines across gaps. Raw/deseasonalized/trend arrays align by month. p_value can be
null when inference is unsupported; direction then means no *supported* trend,
not proof of no physical change. Units and provenance travel with every response.

Example mock request:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/timeseries?var=mock_temperature&bbox=-180,-90,180,90&start=2000-01-01&end=2000-02-29'
```

Example synthetic response (MOCK_DATA=true):

```json
{"variable":{"id":"mock_temperature","name":"Synthetic temperature (NOT NASA)","units":"K","provenance":"mock","source":"Deterministic synthetic fixture","field":null,"annual_aggregation":"mean"},"bbox":[-180,-90,180,90],"spatial_method":"cos(latitude) weighted mean of finite cell centers","series":[{"time":"2000-01","value":280.0},{"time":"2000-02","value":281.52}],"warnings":["Monthly spatial support may vary; no interpolation.","Synthetic data, NOT NASA observations."]}
```

Each map cell is `{latitude,longitude,label,slope,p_value,significant,valid_years,warning}`.
Labels: -1 decreasing, +1 increasing (both FDR supported), 0 testable but not
supported, null untestable. `p_value` is the raw autocorrelation-corrected p-value;
`significant` includes spatial FDR correction. Proportions are unweighted fractions
of testable cells, not geographic area. An opposing-trend flag requires at least
at least 10% of testable cells in each supported direction. Flat cell lists remain
available; aligned latitude/longitude matrices are added for map clients.

Errors use `{detail: ...}`: 422 invalid requests/insufficient series/selection
limits, 404 unknown variables or empty selections, 503 missing/unreadable datasets
or invalid prepared artifacts. Health checks API liveness, not dataset readiness.
Limits are 600 monthly slots and 100 grid cells per selection; no background jobs.
Keep the API local during the hackathon; there is no authentication or public
service capacity management. CORS permits only configured explicit origins.

## Scientific methods and limitations

Input must contain >=60 finite monthly observations, >=80% coverage, and >=3
observations of every calendar month. Missing timestamps are reindexed to monthly
nulls, never interpolated. Preliminary median same-calendar-month pair slopes
remove linear drift before estimating centered calendar-month median climatology.
Subtract this climatology, then fit Theil-Sen against elapsed years. Multiply slope
and interval by 10 for units per decade; the trend line is in deseasonalized units.

Complete series use a deterministic 199-replicate circular residual moving-block
bootstrap (12-month blocks) for approximate 95% slope limits. This assumes stationary
residuals and may miss longer dependence; 199 replicates are exploratory, not a
publication precision guarantee. Gapped series use SciPy's Sen rank interval on
observed months, explicitly warning that autocorrelation is not accounted for in
that interval. CI and p-values use different estimators and can disagree.

Significance is evaluated on complete annual deseasonalized means, with >=10
consecutive years, using Hamed-Rao modified Mann-Kendall, significant detrended
rank autocorrelations at annual lags 1..3, alpha=.05. Thus monthly pseudo-replication
is avoided and annual serial dependence is addressed. Missing annual gaps and
unstable variance corrections withhold inference rather than compress time.
For exactly linear annual series, detrended residual variance is zero and rank
autocorrelation is undefined: the engine explicitly reports an annual MK fallback
without variance inflation. Constant annual series return p=1 directly.
Power with 10 years is limited; lag truncation may miss longer climate persistence.
Paradox uses complete raw annual values (12 finite months), actual calendar years
for slope, and Benjamini-Yekutieli FDR q=.05 over testable cells, valid under arbitrary
spatial dependence but conservative. Direction does not imply causation.

References: [SciPy Theil-Sen](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html),
[pyMannKendall implementation and Hamed-Rao method](https://github.com/mmhs013/pyMannKendall),
[Benjamini-Yekutieli (2001)](https://doi.org/10.1214/aos/1013699998).

## Rhido / Ayesha: prepared demos

Provide `DATA_ROOT/demos/{sahel,amazon,arctic}.json` with the DemoResponse schema
from `/openapi.json`: `case`, `available:true`, `provenance`, `source`,
`validated_by`, `message`, and `result` containing a full TrendResponse or
ParadoxResponse. Result provenance must match the envelope. Scientifically validated
cases require a validator name; unreviewed precomputes set validated=false.
Include product/version/citation and case rationale in source
and message. Files are checked against schemas; no invented case outputs are shipped.

## Waseel extension points

Structured wizard validation, deterministic verdicts, compatibility-checked
comparisons and typed unavailable future-significance estimates are registered.
The current request/response contracts are in [INTEGRATION.md](docs/INTEGRATION.md).
Natural-language AI assistance, an external AI verdict provider and an explicit
validated future effect/noise model remain extension points. Client-provided
statistics must never override authoritative calculations. Unsupported estimates
remain null, with assumptions and limitations disclosed.

Further real-data work includes cross-city measurement harmonization and monthly spatial
grids; source and scientific case review remain necessary.

## Earlier verification history

Latest integration run (2026-11-14): **49 passed in 27.38s**, no warnings;
pip check passed. Genuine NASA POWER sample loaded and analyzed via live HTTP;
independent all-pairs median slope matched exactly, and annual OLS gave a similar
estimate. Full results/timings are in reports/real_pipeline.json. Representative
single-point times: cold trend 2.208s, cached trend .095s, timeseries .091s,
paradox .099s, offline demo .021s. These are local measurements, not deployment
capacity guarantees. The temporary verification server was stopped.

Reproduce the live check: `python -m scripts.verify_real_pipeline` after importing
the sample and preparing the Arctic point demo with the handoff commands.
Scientific findings for Sahel/Amazon/full Arctic remain unverified. The candidate
point demo is available but scientifically unreviewed, explicitly validated=false.

The following results describe earlier runs:

2026-11-14, Windows / Python 3.13: `python -m pytest -q` completed with **26 passed,
1 warning in 15.85s**. The warning is Starlette's deprecation of httpx-backed
TestClient; tests still work. NetCDF and Zarr fixture reads, API contracts and
statistics are covered. `python -m pip check`: no broken requirements.
Live Uvicorn startup succeeded; /health returned HTTP 200 with status ok, OpenAPI
listed all six routes and /demo/sahel explicitly returned unavailable.
Real NASA results and frontend rendering have not been verified.

After migration to the permanent project folder, verification was repeated in a
fresh local virtual environment: **26 passed, 1 warning in 30.95s**; pip check passed.
Live startup on port 8001 returned HTTP 200 for health, docs, OpenAPI, variables,
timeseries, trend, paradox and the unavailable Sahel demo. Scientific HTTP checks
used explicitly labeled mock data. The verification server was then stopped.
