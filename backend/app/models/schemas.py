from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScientificModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class Variable(ScientificModel):
    id: str
    name: str
    units: str = Field(min_length=1)
    provenance: Literal['observations', 'mock']
    source: str
    location_id: str | None = None
    topic: str | None = None
    path: str | None = Field(default=None, exclude=True)
    field: str | None = None
    annual_aggregation: Literal['mean', 'sum'] = 'mean'
    dataset_id: str | None = None
    version: str | None = None
    source_url: str | None = None
    scientific_name: str | None = None
    variable_type: Literal['state', 'monthly_amount', 'rate'] = 'state'
    data_kind: Literal['observation', 'reanalysis', 'synthetic', 'model', 'satellite_estimate'] | None = None
    temporal_coverage: list[str] | None = None
    spatial_resolution: dict[str, float] | None = None
    spatial_support: str = 'rectilinear grid-cell centers'
    limitations: list[str] = Field(default_factory=list)


class Point(ScientificModel):
    time: str
    value: float | None


class SeriesResponse(ScientificModel):
    variable: Variable
    bbox: list[float]
    spatial_method: str = 'cos(latitude) weighted mean of finite cell centers'
    series: list[Point]
    warnings: list[str] = Field(default_factory=list)
    deseasonalized: list[Point] = Field(default_factory=list)
    trend_line: list[Point] = Field(default_factory=list)
    analysis_available: bool = False
    coverage: dict = Field(default_factory=dict)


class TrendResult(ScientificModel):
    direction: Literal['increasing', 'decreasing', 'no_significant_trend']
    significant: bool
    p_value: float | None = Field(ge=0, le=1)
    slope: float
    ci_low: float
    ci_high: float
    slope_units: str
    years: float
    samples: int
    coverage: float
    raw: list[Point]
    deseasonalized: list[Point]
    trend_line: list[Point]
    methods: dict[str, str]
    warnings: list[str]


class TrendResponse(ScientificModel):
    variable: Variable
    bbox: list[float]
    result: TrendResult


class Cell(ScientificModel):
    latitude: float
    longitude: float
    label: Literal[-1, 0, 1] | None
    slope: float | None
    p_value: float | None = Field(ge=0, le=1)
    significant: bool
    valid_years: int
    warning: str | None = None


class ParadoxResponse(ScientificModel):
    variable: Variable
    bbox: list[float]
    cells: list[Cell]
    opposing_trends: bool
    increasing_proportion: float
    decreasing_proportion: float
    valid_cells: int
    slope_units: str
    methods: dict[str, str]
    warnings: list[str]
    latitudes: list[float] = Field(default_factory=list)
    longitudes: list[float] = Field(default_factory=list)
    labels: list[list[int | None]] = Field(default_factory=list)
    slopes: list[list[float | None]] = Field(default_factory=list)
    p_values: list[list[float | None]] = Field(default_factory=list)
    minimum_opposing_share: float = .1


class DemoResponse(ScientificModel):
    case: Literal['sahel', 'amazon', 'arctic']
    available: bool
    provenance: Literal['observations', 'mock', 'unavailable']
    source: str | None = None
    validated_by: str | None = None
    result: TrendResponse | ParadoxResponse | None = None
    message: str
    timeseries: SeriesResponse | None = None
    trend: TrendResponse | None = None
    paradox: ParadoxResponse | None = None
    prepared_at: str | None = None
    validated: bool = False
