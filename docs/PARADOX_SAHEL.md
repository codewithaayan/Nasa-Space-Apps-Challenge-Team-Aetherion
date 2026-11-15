# Paradox Finder: bundled Sahel grid

The production catalog inspected on 15 November 2026 had 36 city CSVs and zero
spatially analyzable datasets. Those averages cannot recover per-cell histories.
The statistical engine and Leaflet rendering existed; the verified Sahel grid
was only configured through a machine-local DATA_ROOT outside the deployment.

Data/Sahel now retains the original and prepared NASA NetCDFs, provenance with
SHA-256 hashes, and a self-contained catalog. Fresh installs without DATA_ROOT
or backend/data/catalog.json discover it. Explicit DATA_ROOT and installed
legacy catalogs retain priority. To select this bundle over a legacy catalog,
set DATA_ROOT to the absolute Data/Sahel directory; never replace team catalogs.

## Flow

1. /api/datasets combines the existing 36 city CSVs with the installed grid.
2. grid__sahel_precipitation is exposed as Western Sahel / Precipitation in the
   wizard, lab and Case Files. It is a region, not a Pakistan-city dataset.
3. /api/datasets/grid__sahel_precipitation/analysis loads native monthly grid
   histories and calls find_paradox, the same engine as /api/paradox. The test
   suite checks both responses agree; no duplicate AI service is needed.
4. The returned paradox object reaches MapPanel regardless of opposing_trends.
   All 99 centres render, including unsupported/unavailable inference, with
   tooltips giving the cell label, slope and raw p-value.
5. The Paradox Finder panel retains counts and the map when no opposing trends
   are supported. City investigations offer an OPEN SAHEL GRID link.

Open /lab?dataset=grid__sahel_precipitation and click RUN ANALYSIS. The 2001–2024
sample has 288 months, 36 supported increases, zero supported decreases,
61 unsupported cells and 2 with inference withheld. This is scientifically
unreviewed input and a valid non-paradox map, not a discovery claim. Chart trends
describe monthly amounts; map trends describe annual totals, both in mm/decade
with different aggregation semantics. See Data/Sahel/README.md for provenance.

## Deployment handoff

The existing prepare-vercel helper copies Data recursively. It now verifies
Sahel hashes first, then bundles its catalog and NetCDFs. No Documents directory
or Windows-specific data path is required. An explicit DATA_ROOT pointing
elsewhere will still exclude Sahel; configure it deliberately if necessary.

Publish/redeploy backend and frontend only after approval. Production remains
unchanged until then. No push, merge, PR or deployment is part of this fix.

## Checks

- backend/tests/test_sahel_grid.py: real NASA hashes, default catalog, override
  isolation, all 36 CSVs retained, wizard, real map with paradox=false,
  standalone /api/paradox agreement and city prerequisite behavior.
- tests/e2e/sahel.spec.js: real-data server on port 8767; city-to-grid link,
  99 Leaflet markers, tooltip, negative paradox finding and report map. All
  external browser requests are blocked; basemap tiles aren't required.
- Existing synthetic-grid tests still cover supported opposing trends and
  single-cell prerequisites without claiming fixtures are NASA measurements.
- Run backend pytest from backend, root frontend build and browser tests; then
  package the backend and check the catalog/analysis from that package.
