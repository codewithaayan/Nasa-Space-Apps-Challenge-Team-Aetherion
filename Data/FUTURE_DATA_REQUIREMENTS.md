# Future data requirements

The full product specification remains in scope. Missing prerequisites are a
collection and implementation backlog; they do not remove the associated feature.

| Collection | Requirements | Enables |
| --- | --- | --- |
| Karachi geographic grids | Monthly histories for each cell, for temperature, precipitation, evapotranspiration, soil moisture, NDVI and aerosols where mapping is intended | Trend overlays, regional selection and Paradox Finder |
| Cross-city harmonization | Lahore and four further cities are now registered. Precipitation is now normalized to mm/hr with recorded conversion. Align MERRA-2 collections, soil depths and evaporation components for currently incompatible pairs; preserve originals and record every transformation | Broader scientifically comparable city pairs |
| Complete common baseline | Complete intended January 2006–December 2025 coverage, including February–December 2025 Karachi precipitation and October–December 2025 precipitation for the other five cities | Consistent period selection and complete annual calculations |
| NDVI extraction evidence | Pixel coordinates or extraction polygon, source request, quality flags, scale/fill metadata | Correct location labels and quality filtering |
| Longer reliable histories | Earlier records where supported; retain product changes and discontinuities | Longer investigations and statistical assessment |
| Original demonstration regions | Sahel precipitation, Amazon vegetation/moisture and Arctic regional temperature | Backend-documented candidate demonstrations, subject to team case selection and review |

Keep original source formats and accompanying metadata. For every dataset record
the product/version, source URL or DOI, download date, extraction request, variable,
units, rate/total/average meaning, actual timestamps, native resolution, requested
region, contributing area, missing-value codes, quality flags and transformations.
Distinguish satellite estimates, observations, reanalysis and model output.

Spatial analysis needs `time × latitude × longitude`, retaining every monthly
layer. A city-average CSV or a single map averaged over the entire record cannot
recover cell histories. Respect native resolution. Reprojection or aggregation
must be documented; copying one cell into smaller cells creates no new evidence.
The current grid API supports 600 monthly slots and 100 cells per selection.

The current significance method needs at least ten consecutive complete years.
Trend estimation also has monthly coverage requirements documented in the backend.
Those are software eligibility rules, not guarantees of calibration or significance.

Years-to-significance still requires an explicit future effect/noise model and
independent validation. AI verdicts must preserve backend statistics and caveats.
Source verification and scientific case review remain necessary even when software
tests pass. An inconclusive trend or absence of opposing trends is a valid result.

Rhido owns ingestion, catalog, caching, precomputed artifacts and deployment.
Abdullah maintains API/calculation/geographic contracts; Aayan connects the frontend.
Waseel owns wizard/verdict/years-to-significance and validation support; Ayesha
reviews sources and demonstration claims.
