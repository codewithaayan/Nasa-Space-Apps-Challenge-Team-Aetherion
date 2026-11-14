from datetime import date

from fastapi import APIRouter

from app.models.csv_datasets import CsvAnalysis, CsvDataset
from app.services.analysis_cache import cached_analyze
from app.services.csv_data import CsvDataSource
from app.services.statistics import monthly_series, points

router = APIRouter()


@router.get('/datasets', response_model=list[CsvDataset])
def datasets(location: str | None = None):
    return CsvDataSource().catalog(location)


@router.get('/datasets/{dataset_id}/analysis', response_model=CsvAnalysis)
def dataset_analysis(dataset_id: str, start: date | None = None, end: date | None = None):
    meta, raw = CsvDataSource().load(dataset_id, start, end)
    warnings = list(meta.limitations)
    try:
        trend = cached_analyze(raw, meta.units)
    except ValueError as exc:
        trend = None
        warnings.append(str(exc))
    if trend is None:
        summary = 'Monthly source values are available, but this selection does not support trend estimation.'
    else:
        trend.warnings = list(dict.fromkeys(trend.warnings + warnings))
        warnings = trend.warnings
        slope = f'{trend.slope:.5g} {trend.slope_units}'
        if trend.p_value is None:
            finding = 'Statistical significance could not be assessed for this selection.'
        elif trend.significant:
            finding = f'The test supports a statistically significant {"increasing" if trend.slope > 0 else "decreasing"} trend under its assumptions.'
        else:
            finding = 'The test does not establish a statistically significant trend; this does not prove an absence of change.'
        summary = f'The estimated change is {slope}. {finding} These exploratory results do not establish a cause.'
    return CsvAnalysis(dataset=meta, series=points(monthly_series(raw)), trend=trend,
                       summary=summary, warnings=list(dict.fromkeys(warnings)))
