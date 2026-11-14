# Integration handoff

The backend now reads a genuine NASA POWER/MERRA-2 temperature sample through
NetCDF and the public API. This is a technical integration check at one requested
point (70N, 20E), not an Arctic-wide climate finding. The raw NASA response is
bundled in examples/ so this workflow can be recreated without internet access.
The build guide was not available in the project; its contents were not assumed.

## Rhido

From backend/: `python -m scripts.import_power_sample` imports the bundled sample
into DATA_ROOT (default backend/data). `--download` explicitly refreshes from NASA;
existing differing data/catalog entries are never silently overwritten. This
small integration utility does not replace your production download pipeline.

Validate prepared data with:

```powershell
.\.venv\Scripts\python.exe -m scripts.validate_dataset --var power_t2m_sample --bbox=19.9,69.9,20.1,70.1
```

See catalog.schema.json for the machine-readable catalog format. NetCDF/Zarr field
dimensions must be time, latitude, longitude, or date/lat/lon aliases. Use decoded
Gregorian timestamps, numeric CF-decoded values and exactly matching unit strings.
Numeric unparsed time, extra dimensions and curvilinear grids are rejected.
Provide stable masks and regular latitude/longitude grids: cosine weights assume
equal longitude widths and regular latitude spacing. Partial spatial support is
not polygon area intersection. The point sample must never be upscaled to a region.

Metadata adds dataset_id, scientific_name, version, source_url, data_kind,
variable_type, temporal_coverage, spatial_resolution and limitations. Never invent
missing metadata. POWER sample version is the API version, not a granule revision.
Use annual_aggregation=mean for state variables or annual_aggregation=sum only
with variable_type=monthly_amount. Convert rates to monthly amounts upstream
using actual interval durations. No automatic rate conversions are attempted.

Precompute with `python -m scripts.precompute_demo arctic --var power_t2m_sample
--bbox=19.9,69.9,20.1,70.1`. The saved response includes timeseries, trend, paradox,
source and review status. Omit --validated-by unless actual scientific review
occurred. Existing demo files are protected from overwrite. Sahel defaults to
[-18,10,40,20], Amazon [-75,-15,-45,5], Arctic [-180,66,180,90]. These regions
and variable pairings are candidate selections, not guarantees of opposite trends.
Sahel precipitation and Amazon vegetation/soil moisture data are still missing.
Full Arctic coverage is still missing. Prepared JSON is readable offline even
when its source NetCDF is disconnected. Deploy the complete data directory.

## Aayan

Existing endpoint names and core fields are preserved. OpenAPI at /docs is the
authoritative typed contract. Internal catalog path is deliberately no longer
serialized (security change); frontend clients should never use local paths.

GET /timeseries retains series:[{time,value}] and adds deseasonalized, trend_line,
analysis_available and coverage. For insufficient data it still returns raw
values; derived arrays are empty with a warning. GET /trend returns 422 for the
same insufficient coverage. Dates are YYYY-MM; missing measurements are null.
Trend lines are fitted model values, not interpolated observations.

GET /paradox retains cells and adds latitudes, longitudes, labels, slopes and
p_values matrices, indexed [latitude row][longitude column]. Null label means
insufficient inference, 0 means testable but unsupported, -1/+1 mean significant
after FDR. Raw p-values are not FDR-adjusted; significant flags are. The paradox
flag now requires >=10% of testable cells in EACH direction (intentional rule
change from just one opposing pair). Shares are cell counts, not area fractions.
The conservative Benjamini-Yekutieli FDR rule remains in place because it permits
arbitrary spatial dependence; do not reinterpret it as Benjamini-Hochberg.

provenance=mock is synthetic. For compatibility, provenance=observations denotes
genuine source data, with data_kind=reanalysis specifying the POWER sample's
actual nature. Show both. Do not label this as direct satellite observations.
CORS defaults to localhost:5173 and 127.0.0.1:5173; configure ALLOWED_ORIGINS for
your actual development/deployed frontend. No wildcard origins or authentication.

## Waseel

`app.services.statistics.analyze(pd.Series with DatetimeIndex, units) -> TrendResult`
remains the independent calculation interface. The cached API wrapper returns
defensive copies; never overwrite calculated results with LLM text. Inputs and
methods are documented in README. Tests include seasonality, fixed-seed noise,
outliers, gaps, exact trends and independent pairwise slope checks on real data.
Check bootstrap calibration, annual lag truncation, small-sample power and
missing-data bias independently before scientific sign-off. Gapped-series CI is
still an explicitly labeled independence approximation; no imputation is applied.

Wizard/verdict proposed contracts in README remain unimplemented and Waseel-owned.
For years-to-significance, consume TrendResponse plus an explicit assumed future
effect/noise model; return estimate_years:number|null, assumptions:string[],
method:string, warnings:string[]. Return null when extrapolation is unsupported.
An LLM must not generate or override p-values, intervals or measured slopes.

## Ayesha

Source: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
Resolution: https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/
The NASA response records MERRA2, units C, January 2000–December 2019,
POWER API v2.10.0, fill_value=-999 and requested point coordinates. NASA POWER's
meteorology is MERRA-2 assimilation/reanalysis. Native source resolution is
0.5 degrees latitude x 0.625 degrees longitude; a requested point is not a
claim of finer resolution. The importer excludes month 13 annual summaries and
maps missing flags to NaN. No causal conclusions or validated paradox are claimed.
See reports/real_pipeline.json for measured slope, interval and sensitivity check.

## Deployment checklist (Rhido)

- Python 3.11–3.13; install backend/requirements.txt in an isolated environment.
- Working directory backend; start `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Set DATA_ROOT to an absolute local prepared-data directory, ALLOWED_ORIGINS to
  explicit frontend origins and MOCK_DATA=false. Never put credentials in catalog.
- Copy prepared NetCDF/Zarr, catalog and demos onto persistent readable storage.
- Run dataset validator and pytest before startup; check /health and /variables.
- 600 monthly slots, 100 cells per request; no authentication/rate limiting.
  Keep private or place behind hosting access controls before public traffic.
- Analysis cache holds 16 value-keyed results per worker, with no dataset handles;
  workers have independent caches. Source files reopen and close each request.
- No deployment or service purchase was performed by this implementation.
