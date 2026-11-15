from typing import Literal

from pydantic import Field

from app.models.schemas import Point, ScientificModel, TrendResult, ParadoxResponse


class UnitConversion(ScientificModel):
    source_units: str
    target_units: str
    factor: float = Field(gt=0)
    method: str


class CsvDataset(ScientificModel):
    id: str
    location_id: str
    topic: str
    name: str
    units: str
    source_units: str | None = None
    unit_conversion: UnitConversion | None = None
    source: str
    source_url: str | None = None
    documentation_url: str | None = None
    source_file: str | None = None
    source_sha256: str | None = None
    source_revision: str | None = None
    source_variable: str | None = None
    dataset_id: str | None = None
    version: str | None = None
    data_kind: Literal['satellite_estimate', 'reanalysis', 'model', 'observation', 'synthetic'] | None = None
    provenance: Literal['source_export', 'observations', 'mock'] = 'source_export'
    scientific_review: Literal['unreviewed'] = 'unreviewed'
    storage_format: Literal['csv', 'netcdf', 'zarr', 'synthetic'] = 'csv'
    temporal_coverage: list[str]
    latest_record: Point | None = None
    finite_months: int | None = None
    monthly_slots: int
    requested_bbox: list[float] | None = None
    data_bbox: list[float] | None = None
    spatial_support: str
    spatial_analysis_available: bool = False
    limitations: list[str] = Field(default_factory=list)


class FeatureStatus(ScientificModel):
    available: bool
    reason: str | None = None


class HistoricalPrefix(ScientificModel):
    complete_years: int
    start_year: int
    end_year: int
    p_value: float | None = Field(None, ge=0, le=1)
    adjusted_p_value: float | None = Field(None, ge=0, le=1)
    significant: bool = False
    warning: str | None = None


class YearsEstimate(ScientificModel):
    estimate_years: float | None = None
    observed_complete_years: int = 0
    historical_years_to_significance: int | None = None
    historical_prefixes: list[HistoricalPrefix] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    method: str = 'No validated future effect/noise model is configured'
    warnings: list[str] = Field(default_factory=lambda: [
        'Historical significance is not a forecast of when future significance will occur.'])


class Verdict(ScientificModel):
    verdict: str
    caveats: list[str]
    provenance: str
    method: str = 'Deterministic explanation of backend-computed statistics'
    ai_generated: bool = False


class CsvAnalysis(ScientificModel):
    dataset: CsvDataset
    series: list[Point]
    trend: TrendResult | None = None
    summary: str
    warnings: list[str]
    selection_bbox: list[float] | None = None
    paradox: ParadoxResponse | None = None
    feature_status: dict[str, FeatureStatus] = Field(default_factory=dict)
    years_to_significance: YearsEstimate = Field(default_factory=YearsEstimate)
    verdict: Verdict | None = None
