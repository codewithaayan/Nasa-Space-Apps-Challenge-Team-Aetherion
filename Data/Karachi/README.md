# Karachi source exports

The original CSV files are preserved. `manifest.json` describes how to read their
different layouts and how to label the results. The backend reads them directly;
the catalog is independent of the existing NetCDF/Zarr integration.

| Topic | Product declared in export | Retained units | Actual coverage |
| --- | --- | --- | --- |
| Air temperature | MERRA-2 M2IMNXASM 5.12.4 | K | January 2006–December 2025 |
| Aerosol optical thickness | MERRA-2 M2TMNXAER 5.12.4 | dimensionless | January 2006–December 2025 |
| Precipitation rate | GPM IMERG Final 07 | inch/day | January 2006–January 2025 |
| Evapotranspiration rate | GLDAS Noah 2.1 | kg m-2 s-1 | January 2006–December 2025 |
| Soil moisture content, 0–10 cm | GLDAS Noah 2.1 | kg m-2 | January 2006–December 2025 |
| Vegetation NDVI | MOD13A3 061 filename identifiers | dimensionless | January 2006–December 2025 |

Units are retained, with no unit conversion, additional NDVI scaling, interpolation
or artificial spatial replication. Precipitation units follow the embedded export
request. GLDAS units follow the [NASA GLDAS product documentation](https://docserver.gesdisc.eosdis.nasa.gov/public/project/hydrology/README_GLDAS2.pdf).
MERRA-2 quantities follow its [file specification](https://gmao.gsfc.nasa.gov/pubs/docs/Bosilovich785.pdf).
The annual significance test uses equal-month annual means. These rate series
are not annual precipitation or evapotranspiration accumulations.

## Provenance and limitations

The supplied files declare NASA sources; they have not been independently
authenticated against downloaded original granules. API provenance is
`source_export`, with product-specific `data_kind` and `scientific_review=unreviewed`.
Every response includes the source filename, SHA256 fingerprint, available dates,
source request where present, documentation and limitations. No absolute local
paths are returned. Reanalysis, model output and satellite estimates remain distinct.

The temperature CSV contains records through December 2025, but its reproduction
URL ends in December 2015. Reconcile the extraction request with the data producer.
The discrepancy is exposed in the catalog and every analysis, without changing
the source metadata or pretending the issue has been resolved.

The five Giovanni exports are already spatially averaged. Temperature and aerosols
report one contributing native cell, centred at 25N, 66.875E. The NDVI statistics
contain one pixel per month with no coordinates or QA flags. Its Karachi association
comes from the supplied folder, not verified geolocation. The city marker is only
a reference. No CSV is represented as a new geographic grid.

## Extending ingestion

Add original source files and explicit manifest entries with unique IDs, location,
topic, date/value columns, units, product/version, product type and spatial support.
Do not infer missing coordinates or units from numeric values. The source path must
remain inside `CSV_DATA_ROOT`. Duplicate monthly timestamps, unsafe paths, infinite
values, malformed records and selections exceeding source coverage are rejected.
Declared fill values become missing values; missing months stay null.

For another city, configure a common source root and manifest containing relative
paths to both cities' files. The comparison UI checks product, version, units and
date overlap. Actual spatial grids should use the existing geographic adapter.
See [future data requirements](../FUTURE_DATA_REQUIREMENTS.md).
