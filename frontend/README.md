# Trend Detective: Case Files

A React/Vite frontend for investigating environmental trends. The interface is intentionally in demo mode: it contains no scientific observations or precomputed findings, and it does not calculate statistics in the browser.

## Run locally

```sh
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the FastAPI service origin when a backend is available. The centralized client in `src/api/client.js` prepares calls for `/variables`, `/timeseries`, `/trend`, `/paradox`, `/verdict`, `/wizard` and `/demo/{case}`. No API credentials belong in this frontend.

## Frontend routes

- `/` — project landing page and the Karachi/Lahore entry points
- `/wizard` — topic, location, coverage and review steps
- `/lab` — investigation controls, map, chart, statistics and signature feature states
- `/cases` and `/cases/:caseId` — case file archive and printable report templates
- `/compare` — Karachi/Lahore comparison template
- `/about` — plain-language science guide

Time periods remain unavailable until data coverage is verified. Maps are location references only; trend overlays and all result panels remain empty until backend-computed, verified data is supplied.

## Build

```sh
npm run build
```
