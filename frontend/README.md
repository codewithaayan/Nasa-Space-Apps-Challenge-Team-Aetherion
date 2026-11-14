# Trend Detective frontend entry point

The canonical application lives in repository-root src/. This older entry point
imports the same application, including CSV dataset discovery, date selection,
charts, backend statistics, source limitations and printable reports.

Install dependencies and run the app from the repository root:

```sh
npm ci
npm run dev
```

Follow the [root run instructions](../README.md) to start the FastAPI backend.
The default API origin is http://localhost:8000. Configure VITE_API_BASE_URL when
using a different backend, and ALLOWED_ORIGINS for the actual frontend origin.
No credentials belong in frontend source or environment variables.

After installing root dependencies, this directory's npm run dev and npm run build
commands remain supported too. Its Vite configuration permits the shared source
outside this directory. New interface changes belong in the root src/ directory.

Karachi exports support exploratory time-series analysis. Lahore data, spatial
grids, an AI verdict implementation and a validated years-to-significance model
remain planned. Scientific review is separate from software verification.
