# Trend Detective: Case Files

This is Rhido's **Rozenweig-Index** deployment fork. Its default `deployment`
branch holds the automation; [`main`](https://github.com/ridhofrd/Rozenweig-Index/tree/main)
mirrors the team's latest application. See [automatic deployment](AUTO_DEPLOYMENT.md)
for the workflow, service settings and maintenance steps.

A React/Vite frontend and FastAPI backend for investigating environmental trends.
Live app: [trend-detective-aetherion.pages.dev](https://trend-detective-aetherion.pages.dev).
API: [health check](https://trend-detective-aetherion-api.vercel.app/api/health).
The six supplied Karachi CSV exports now support dataset discovery, coverage-aware
date selection, monthly charts, seasonal adjustment, trend statistics and printable
case reports. Statistics run in the backend; source files are read without changes.
Results are exploratory and scientifically unreviewed.

The frontend now shares a dataset contract across CSV and NetCDF/Zarr providers.
Gridded selections can populate the native-cell trend map and Paradox Finder;
CSV averages retain explicit spatial limitations. City comparison is checked by
the backend for product/version, units, source kind and overlapping dates.
Prepared Sahel/Amazon/Arctic artifacts are discoverable from the case archive.

## Start both services

After the Python environment and root npm dependencies are installed as below,
run `npm run dev:all` from the repository root. It starts FastAPI on port 8000 and
Vite on port 5173. `BACKEND_PORT` and `FRONTEND_PORT` select alternate local ports.
The development proxy forwards `/api` to the backend.
`dev:all` selects this local API even if `.env` points to the deployed backend.
To run just the interface against the live API, use `npm run dev` with
`VITE_API_BASE_URL=https://trend-detective-aetherion-api.vercel.app/api` in `.env`.

For one-origin local production: set `VITE_API_BASE_URL=/api` while running
`npm run build`, then run `npm start`. Open
`http://127.0.0.1:8000`. FastAPI serves the built interface, assets, API and direct
report/case URLs. It does not require a separate static server.

## Run locally

Use Python 3.11–3.13 for the backend. From the repository root:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, from the repository root:

```sh
npm ci
copy .env.example .env
npm run dev
```

The default frontend API base is `/api`. Keep that setting for the development
proxy and the one-origin production server. `BACKEND_URL` selects the development
proxy target; `dev:all` sets it to the chosen backend port. An old `.env` with an
absolute `VITE_API_BASE_URL` overrides this default; update it when switching to
the proxy. Set an absolute API origin only for separate hosting. The backend's
`ALLOWED_ORIGINS` must include the actual frontend origin; defaults are
`http://localhost:5173` and `http://127.0.0.1:5173`.

`CSV_DATA_ROOT` defaults to `Data/Karachi` at the repository root. Its
`manifest.json` declares source columns, product versions, units and limitations.
No database or conversion into a spatial grid is required. No files are downloaded
at request time. See [CSV dataset notes](Data/Karachi/README.md).

The root `src/` is the canonical frontend. The older `frontend/` entry point
imports it too; install dependencies at the root for either launch path.

## Frontend routes

- `/` — project landing page and the Karachi/Lahore entry points
- `/wizard` — topic, location, actual monthly coverage and review steps
- `/lab` — monthly source values, adjusted values, trend, statistics and provenance
- `/cases` and `/cases/:caseId` — source-backed, printable reports; dataset and dates can be linked in the URL
- `/compare` — comparison using matching product/version/units and overlapping dates when both cities have data
- `/about` — plain-language science guide

Maps remain location references. Paradox Finder awaits per-cell monthly grids;
Lahore awaits compatible data. AI verdict and years-to-significance retain their
planned scope and await their implementations and scientific validation. The
current plain-language summary is deterministic and based on computed statistics.
No positive trend or statistical significance is guaranteed.

## API and checks

The shared integration uses `GET /api/datasets` (optional `location=karachi`) and
`GET /api/datasets/{id}/analysis?start=2006-01-01&end=2025-12-01`.
Available dates depend on the dataset: precipitation ends in January 2025.
Out-of-coverage and reversed dates are rejected. Short periods return source
values with inference unavailable. Grids accept `bbox=west,south,east,north`.
CSV averages cannot be spatially subset. Responses include the actual analysis,
source metadata, verdict, per-feature availability and explicit null estimates
when a validated future-significance model is absent. Original root API routes
remain compatible. See [integration contracts](backend/docs/INTEGRATION.md).

From `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m scripts.verify_csv_pipeline
```

The second command requires the backend to be running; `--base-url` selects
another local port. Tests use local source exports and deterministic fixtures,
without NASA downloads. Passing software checks is separate from scientific review.

For browser integration tests, install Chromium with `npx playwright install chromium`,
then run `npm run test:e2e`. An installed Edge browser can be used on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

The suite starts two isolated localhost servers, blocks external requests, tests
the supplied Karachi data, and exercises future grid/comparison contracts using
explicitly labeled synthetic fixtures. Fixtures and screenshots/PDFs stay under
ignored `work/e2e/`; normal startup never enables them. Browser checks cover the
wizard, charts, source units, date persistence, reports/printing, grid maps,
prepared cases, comparisons, retry behavior and mobile layout.

## Build

For Cloudflare Pages and Vercel hosting, see the [deployment walkthrough](docs/DEPLOYMENT.md).
It explains the request flow, service settings, approved branch publication and
live verification. `npm run build:cloud` requires an explicit deployed HTTPS
`VITE_API_BASE_URL` ending in `/api`; ordinary local builds keep `/api` by default.

```sh
npm run build
```
