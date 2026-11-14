# Trend Detective: Case Files

A React/Vite frontend and FastAPI backend for investigating environmental trends.
The six supplied Karachi CSV exports now support dataset discovery, coverage-aware
date selection, monthly charts, seasonal adjustment, trend statistics and printable
case reports. Statistics run in the backend; source files are read without changes.
Results are exploratory and scientifically unreviewed.

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

The default API origin is `http://localhost:8000`. Set `VITE_API_BASE_URL` in
the frontend environment when using a different origin. The backend's
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

The CSV integration uses `GET /datasets` (optional `location=karachi`) and
`GET /datasets/{id}/analysis?start=2006-01-01&end=2025-12-01`.
Available dates depend on the dataset: precipitation ends in January 2025.
Out-of-coverage and reversed dates are rejected. Short periods return source
values with inference unavailable. Existing gridded endpoints remain unchanged.

From `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m scripts.verify_csv_pipeline
```

The second command requires the backend to be running; `--base-url` selects
another local port. Tests use local source exports and deterministic fixtures,
without NASA downloads. Passing software checks is separate from scientific review.

## Build

```sh
npm run build
```
