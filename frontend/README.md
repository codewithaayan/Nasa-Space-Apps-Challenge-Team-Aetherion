# Rosenzweig Index frontend entry point

The canonical application lives in repository-root src/. This older entry point
imports the same application, including CSV dataset discovery, date selection,
charts, backend statistics, source limitations and printable reports.

Install dependencies and run the app from the repository root:

```sh
npm ci
npm run dev
```

Follow the [root run instructions](../README.md) to start the FastAPI backend.
The default API base is /api. The Vite development proxy uses BACKEND_URL,
and the local production server serves the built interface and API together.
Run npm run dev:all from the root to start both development services. Configure
VITE_API_BASE_URL and ALLOWED_ORIGINS only when using separate origins.
No credentials belong in frontend source or environment variables.

After installing root dependencies, this directory's npm run dev and npm run build
commands remain supported too. Its Vite configuration permits the shared source
outside this directory. New interface changes belong in the root src/ directory.

Six Pakistan cities are available for map targeting and investigations. Karachi
exports support exploratory time-series analysis; other cities await compatible
datasets. Grid maps, prepared cases and comparison contracts are connected. An AI provider and a validated
years-to-significance model remain unconfigured. Scientific review is separate from software verification.
