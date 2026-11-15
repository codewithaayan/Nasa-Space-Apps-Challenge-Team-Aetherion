# Western Sahel gridded precipitation

This directory retains the verified NASA POWER grid obtained on 14 November
2026. The NetCDF bytes are unchanged from the separate Sahel handoff; SHA-256
hashes, exact NASA request, coverage and derivation are in provenance.json.

- 2001-01 through 2024-12: 288 months, 99 native cell centres, no missing values.
- 12–17 N and 5 W–0 E; 0.5 latitude by 0.625 longitude degrees, no interpolation.
- NASA POWER Version 10.0.0 / MERRA-2 bias-corrected precipitation reanalysis.
- PRECTOTCORR retains NASA monthly mean daily rates in mm/day.
- precipitation_amount is mm/day times actual Gregorian days in each month,
  including leap years, giving monthly amounts in mm. YYYY13 annual summaries
  were removed and monthly dates decoded upstream; original response is retained.
- catalog.json selects monthly amounts and annual_aggregation=sum so the map
  compares annual totals. The chart trend instead describes monthly amounts.

This is a western Sahel study window, not Karachi, Lahore or a Pakistan region.
No land mask is applied. Source precision, reanalysis uncertainty and the chosen
period limit interpretation. Scientific review is pending; no paradox discovery
is claimed. Current screening returns 36 supported increases, no supported
decreases, 61 unsupported cells and 2 with inference withheld.

Fresh checkouts/deployment packages use this grid when DATA_ROOT is unset and
backend/data/catalog.json is absent. Explicit DATA_ROOT and installed legacy
catalogs retain priority. To select this collection explicitly, set DATA_ROOT
to the absolute path of this directory. CSV city catalogs remain separate.

The UI ID is grid__sahel_precipitation (location sahel, topic precipitation).
Open /lab?dataset=grid__sahel_precipitation and run analysis. Both
/api/datasets/grid__sahel_precipitation/analysis and
/api/paradox?var=sahel_precipitation&bbox=-5,12,0,17 return cell results.
opposing_trends=false must not hide the map.

NASA documentation: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
