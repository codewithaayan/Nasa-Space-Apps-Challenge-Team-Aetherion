from typing import Literal

from pydantic import Field

from app.models.schemas import Point, ScientificModel, TrendResult


class CsvDataset(ScientificModel):
    id: str
    location_id: str
    topic: str
    name: str
    units: str
    source: str
    source_url: str | None = None
    documentation_url: str | None = None
    source_file: str
    source_sha256: str
    dataset_id: str
    version: str
    data_kind: Literal['satellite_estimate', 'reanalysis', 'model']
    provenance: Literal['source_export'] = 'source_export'
    scientific_review: Literal['unreviewed'] = 'unreviewed'
    storage_format: Literal['csv'] = 'csv'
    temporal_coverage: list[str]
    finite_months: int
    monthly_slots: int
    requested_bbox: list[float] | None = None
    data_bbox: list[float] | None = None
    spatial_support: str
    spatial_analysis_available: bool = False
    limitations: list[str] = Field(default_factory=list)


class CsvAnalysis(ScientificModel):
    dataset: CsvDataset
    series: list[Point]
    trend: TrendResult | None = None
    summary: str
    warnings: list[str]
