# NASA regional city grids

Twelve NASA POWER monthly regional NetCDF downloads: temperature (T2M) and
corrected precipitation (PRECTOTCORR) for Karachi, Lahore, Islamabad, Quetta,
Peshawar and Gilgit. Each contains January 1981–December 2025: 540 months,
45 complete years, 12 native cells (16 for Peshawar).

Source: NASA Langley Research Center, POWER Version 10.0.0, MERRA-2 reanalysis.
Documentation: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
Native source resolution: 0.5° latitude × 0.625° longitude:
https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/

`original/` preserves NASA responses byte for byte. `provenance.json` records
each exact NASA request, retrieval time, original/prepared SHA256, actual cell
coordinates, coverage, units and processing. `catalog.json` registers the
prepared files independently of teammates' CSV manifests and the Sahel catalog.

## Processing and scope

- Remove YYYY13 annual summary records; decode real monthly dates.
- Temperature keeps NASA Celsius values (`C`).
- Rainfall: NASA monthly mean daily rate (`mm/day`) × actual Gregorian days in
  that month = monthly amount (`mm`). Map trends use complete annual totals;
  chart trends describe monthly amounts. Source rounding remains in the result.
- No interpolation, copied points, invented months or generated observations.
- Request windows extend one degree around each city centre. These describe
  cities **and their surroundings**, not municipal boundaries or urban heat
  islands. Coarse coastal windows can include sea; mountains mix elevations.
- All prepared values are finite. Coordinates and hashes are verified offline.

## Import and run

From `backend`, with project requirements installed:

```powershell
python -m scripts.import_power_city_grids
```

This verifies/recreates prepared files from bundled originals, without network
access. Use `--download` only to obtain missing originals from NASA. Existing
different data are rejected rather than silently overwritten.

Fresh checkouts load Sahel plus these grids automatically. If your launcher
sets `DATA_ROOT` explicitly, opt in with `$env:BUNDLED_CITY_GRIDS='true'`.
Explicit external data roots otherwise remain isolated. No CSV files change.

`GET /api/datasets` lists `grid__power_<city>_<topic>`. For example:

```text
GET /api/datasets/grid__power_karachi_temperature/analysis?start=1981-01-01&end=2025-12-01
GET /api/paradox?var=power_karachi_temperature&bbox=66,23,68,26&start=1981-01-01&end=2025-12-01
```

The wizard defaults temperature/rainfall to the native regional grid. The Lab
dataset selector preserves access to the original city-average CSV exports.
Other topics still need real spatial source files before local mapping is possible.

## Historical evidence, not future prediction

Years-to-Significance now checks expanding observed prefixes, starting at ten
complete years. Complete annual equal-month means feed the existing modified
Mann–Kendall calculation. Nonconsecutive complete years or unstable inference
are withheld. Benjamini–Yekutieli correction covers repeated prefix tests.
Raw and adjusted p-values and all prefix periods are exposed for inspection.
The first supported prefix can lose significance later; it is neither a future
date nor a guaranteed minimum required record length. `estimate_years` remains
null. Results remain exploratory and scientifically unreviewed.

This implements the challenge's NASA-variable time-series visualization,
rate-of-change and significance goals. It makes no NASA endorsement claim.
Challenge: https://staging-web-v2.spaceappschallenge.org/2026/challenges/earth-system-trend-detective2/
