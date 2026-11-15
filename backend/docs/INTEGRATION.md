# Frontend and backend integration

The canonical frontend uses same-origin `/api` requests. Vite proxies those in
development; FastAPI serves the built frontend and API together in local
production. The original root data endpoints remain available. Case inventory
is `/api/cases` only, so direct browser navigation to `/cases` serves the app.

| Contract | Behavior |
| --- | --- |
| `GET /api/datasets` | CSV and grid metadata, actual dates, units, source kind and spatial support. Optional location filter. |
| `GET /api/datasets/{id}/analysis` | Monthly values, nullable trend, native-cell paradox result where supported, verdict, warnings and per-feature availability. Optional ISO start/end and grid bbox. |
| `POST /api/wizard` | Validates structured dataset/location/topic/date selections against the installed catalog. Returns the canonical selection or an explicit missing-data state. |
| `POST /api/verdict` | Recomputes authoritative backend statistics and returns a deterministic explanation with provenance/caveats. No client-supplied p-values or model prose override calculations. |
| `POST /api/years-to-significance` | Returns a typed null estimate and a reason until an actual validated future effect/noise model is configured. |
| `POST /api/comparison` | Checks distinct locations, topic, product/version, source variable, output units, provenance/kind and shared coverage. `run=false` checks readiness; `run=true` calculates both selections. |
| `GET /api/cases` | Discovers the existing Sahel/Amazon/Arctic prepared-artifact states. Invalid artifacts remain unavailable. |
| `GET /api/demo/{case}` | Reads the validated envelope of an offline prepared case, retaining original source and scientific-review status. |

Selection request for verdict or years-to-significance:

```json
{"dataset_id":"karachi_temperature","start":"2006-01-01","end":"2025-12-01"}
```

Wizard accepts optional dataset_id, location, topic, start, end and bbox.
Defaults select Karachi temperature only when no explicit dataset is given.
Contradictory selections and unknown request fields are rejected. This is a
structured wizard endpoint, not an unconfigured natural-language AI service.

Comparison request:

```json
{"topic":"temperature","left_location":"karachi","right_location":"lahore","run":true}
```

Dates can narrow a compatible shared period. Missing or incompatible sources are
typed `available=false` responses. Malformed or out-of-range dates return 422.
Unknown datasets return 404; unreadable prepared data returns sanitized 503 errors.

## Dataset providers

CSV records use their manifest IDs. Grids use `grid__{variable_id}` and the existing
DATA_ROOT catalog/adapter. Gridded metadata may declare optional `location_id` and
`topic` to associate a source with a city and topic. Unassigned grids appear under
Dataset region and keep their own variable ID as the topic. Native coordinate
metadata supplies selectable bounds; bounds around a single point are selection
conveniences, not a claim of a regional footprint. No grid is generated from a CSV.

The wizard and lab discover new registered locations/topics. Lab/report dataset,
dates and grid bbox can be linked and survive refresh. Changing a selection clears
old results and aborts pending requests. The map uses native cell centres, raw
p-values and FDR-screened direction labels. Cell shares are not geographic area.

Source CSV bytes and fingerprints are preserved. Precipitation is returned in
mm/hr; Karachi is explicitly converted from inch/day using 25.4 / 24 before
analysis. `source_units` and `unit_conversion` record this transformation. Other
quantities retain native units. Grids carry their source
revision and provenance. Mock fixtures remain labeled synthetic, NASA POWER retains
data_kind=reanalysis, and missing NDVI location information is never invented.
Catalog month counts for grids describe coordinate coverage; finite-data coverage
is calculated only for the selected series.

## Scientific prerequisites

The full feature scope remains planned. All six cities have registered CSV
exports, but area-averaged series cannot support regional opposing-trend maps.
Different soil layers, evaporation components and MERRA-2 collections still need
harmonization before comparison. NDVI extraction geolocation remains unverified. The verdict
is a computed explanation (`ai_generated=false`); no external AI provider is configured.
Years-to-significance is connected as an explicit unavailable-model response. An
unconfigured model must not produce a numeric estimate or a promise of significance.
Software tests and browser fixtures do not establish scientific validation.

## Verification

Run pytest from backend/. Run the root `npm run test:e2e` after installing a
Playwright browser, or set PLAYWRIGHT_CHANNEL=msedge for an installed Windows Edge.
The browser suite serves production builds, so direct links and assets are checked
alongside API flows. It blocks external tile/font requests, leaving source markers
and charts testable offline. Clearly synthetic NetCDF and comparison fixtures are
created under workspace work/e2e/ and are never enabled by ordinary startup.
