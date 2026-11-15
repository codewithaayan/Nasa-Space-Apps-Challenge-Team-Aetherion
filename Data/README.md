# Regional source-export catalog

The app registers 36 supplied CSV exports: six topics each for Karachi, Lahore,
Gilgit, Islamabad, Peshawar and Quetta. Original CSV bytes and filenames are
preserved, including spelling differences in the supplied filenames. Each city
has an explicit `manifest.json`; the backend discovers those manifests under
`Data/` and exposes one catalog through `/api/datasets`.

`CSV_DATA_ROOT` can select another multi-city directory. If that directory has a
top-level `manifest.json`, only that collection is used, preserving existing
single-city installations and offline fixtures. Paths must stay inside their
own manifest directory, and IDs must be unique across all discovered manifests.

## What is supplied

| Topic | Karachi | Lahore | Gilgit, Islamabad, Peshawar | Quetta |
| --- | --- | --- | --- | --- |
| Temperature | M2IMNXASM / T2M, K | M2IMNXASM / T2M, K | M2SMNXSLV / T2MMEAN, K | M2SMNXSLV / T2MMEAN, K |
| Precipitation | IMERG precipitation, mm/hr (converted from inch/day) | IMERG precipitation, mm/hr | IMERG precipitation, mm/hr | IMERG precipitation, mm/hr |
| Evaporation topic | GLDAS Evap_tavg total evapotranspiration, kg m-2 s-1 | GLDAS ESoil_tavg bare-soil energy flux, W m-2 | GLDAS Evap_tavg total evapotranspiration, kg m-2 s-1 | GLDAS ECanop_tavg canopy energy flux, W m-2 |
| Soil moisture | GLDAS 0–10 cm, kg m-2 | GLDAS 10–40 cm, kg m-2 | GLDAS 10–40 cm, kg m-2 | GLDAS 10–40 cm, kg m-2 |
| NDVI | MOD13A3 statistics, dimensionless; Count 1 | MOD13A3 statistics, dimensionless; Count 2304 | MOD13A3 statistics, dimensionless; contributing counts vary by export | MOD13A3 statistics, dimensionless; Count 2352 |
| Aerosols | MERRA-2 TOTEXTTAU, dimensionless | Same field | Same field | Same field |

All series start in January 2006. Precipitation ends in January 2025 for Karachi
(229 months), and September 2025 for the other five cities (237 months). Other
files contain 240 monthly rows through December 2025. Actual file coverage takes
precedence over filenames and reproduction URLs. Missing months are not invented.

The new precipitation exports contain no explicit unit override in their
Giovanni reproduction requests. Their mm/hr unit follows the documented native
IMERG `precipitation` field. The original request should still be confirmed
during scientific review. Karachi's request explicitly selects inch/day. The
application converts Karachi rates using `mm/hr = inch/day × 25.4 ÷ 24`, before
seasonal adjustment, slopes and confidence intervals are calculated. Original
CSV bytes remain unchanged. API metadata includes `source_units=inch/day` and a
`unit_conversion` object with source/target units, factor and method; displayed
values and trend units are mm/hr. Missing months/fill values remain missing.

Product definitions and units were checked against the
[NASA IMERG V07 technical documentation, Table 2](https://gpm.nasa.gov/sites/default/files/2023-07/IMERG_TechnicalDocumentation_final_230713.pdf),
[NASA GLDAS-2 parameter table](https://hydro1.gesdisc.eosdis.nasa.gov/data/GLDAS/README_GLDAS2.pdf),
and [NASA's M2SMNXSLV collection description](https://disc.gsfc.nasa.gov/datasets/M2SMNXSLV_5.12.4/summary).

## Analysis and comparison

Every registration supports catalog discovery, coverage-aware wizard selections,
source-value charts, trend calculations when the selected period supports them,
backend summaries and printable reports. City pairs are selectable in the
comparison page. A matching topic name is not sufficient: product, version,
source variable, units, provenance and data kind must also match.

Examples:

- Karachi/Lahore temperature is compatible at the software-contract level.
- Gilgit/Islamabad temperature uses the matching M2SMNXSLV collection.
- Lahore/Islamabad precipitation uses the same native mm/hr rate.
- Lahore/Quetta soil moisture uses the same 10–40 cm layer.
- Karachi/Lahore soil moisture is blocked because the depths differ.
- Lahore/Quetta evaporation is blocked even though both units are W m-2, because
  bare-soil and canopy evaporation are different quantities.
- Karachi/Lahore precipitation is compatible in mm/hr after the explicit
  conversion. Shared coverage ends in January 2025, the end of the Karachi file.
- Karachi/Gilgit temperature needs a reviewed cross-collection strategy or
  matching exports.

The response's `source_variable` identifies the exported value column, with the
Giovanni `mean_` prefix removed. The source filename, SHA-256 fingerprint,
reproduction request, product, type and limitations remain in every analysis.

## Scientific limits

All data retain `provenance=source_export` and `scientific_review=unreviewed`.
Supplied provenance is not independently authenticated. A passing software test
does not validate the science or establish a cause for an apparent trend.

Giovanni exports contain area-averaged series, sometimes from just one coarse
native cell. Requested boxes and contributing cell-centre bounds remain distinct
from measurement footprints. They do not provide per-cell monthly histories, so
these CSVs do not enable spatial trend maps or Paradox Finder.

NDVI files provide monthly summary statistics without pixel coordinates or an
extraction polygon. City names are folder associations; their geolocation remains
unverified. Counts and regional support differ across exports. Viewing or
comparing these records is exploratory and does not establish a verified
city-wide vegetation comparison. Collect extraction geometry, quality flags and
scale/fill metadata before validated geographic claims.

Future-significance modelling, AI-provider integration, harmonized comparisons
and real spatial grids remain in the [data backlog](FUTURE_DATA_REQUIREMENTS.md).

## Extending the catalog

Place original exports and a reviewed registration manifest in `Data/<Region>/`.
Use stable IDs, an accurate `location_id`, actual time/value column names, product
versions, source units, any supported explicit conversion and limitations. Regions also need frontend
reference labels/coordinates for location cards; those reference points must not
be presented as measured footprints. Run backend pytest from `backend/`, browser
integration tests, and the backend packaging check before team review.
