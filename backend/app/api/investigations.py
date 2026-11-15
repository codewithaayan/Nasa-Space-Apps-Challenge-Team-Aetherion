from datetime import date

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import ConfigDict, Field

from app.api.routes import demo
from app.models.csv_datasets import CsvAnalysis, CsvDataset, Verdict, YearsEstimate
from app.models.schemas import ScientificModel
from app.services.investigations import Investigations
from app.services.geo import parse_bbox

router = APIRouter()
cases_router = APIRouter()


class StrictRequest(ScientificModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class Selection(StrictRequest):
    dataset_id: str = Field(min_length=1, max_length=200)
    start: date | None = None
    end: date | None = None
    bbox: str | None = Field(default=None, max_length=200)


class WizardRequest(StrictRequest):
    dataset_id: str | None = None
    location: str | None = None
    topic: str | None = None
    start: date | None = None
    end: date | None = None
    bbox: str | None = None


class WizardResponse(ScientificModel):
    available: bool
    selection: Selection | None = None
    dataset: CsvDataset | None = None
    explanation: str


@router.post('/wizard', response_model=WizardResponse)
def wizard(request: WizardRequest):
    catalog = Investigations().catalog()
    if request.dataset_id:
        dataset = next((d for d in catalog if d.id == request.dataset_id), None)
    else:
        candidates = [d for d in catalog if d.location_id == (request.location or 'karachi')
                      and d.topic == (request.topic or 'temperature')]
        dataset = next((d for d in candidates if d.spatial_analysis_available), candidates[0] if candidates else None)
    if dataset is None:
        return WizardResponse(available=False, explanation='This selection is awaiting a registered dataset.')
    if (request.location and dataset.location_id != request.location) or (request.topic and dataset.topic != request.topic):
        raise ValueError('Selected dataset does not match the requested location and variable')
    start = pd.Period(request.start or dataset.temporal_coverage[0], freq='M').start_time.date()
    end = pd.Period(request.end or dataset.temporal_coverage[1], freq='M').start_time.date()
    first, last = [pd.Period(t, freq='M') for t in dataset.temporal_coverage]
    if pd.Period(start, freq='M') < first or pd.Period(end, freq='M') > last or start > end:
        raise ValueError('Choose a period within dataset coverage, with start on or before end')
    if request.bbox and dataset.storage_format == 'csv':
        raise ValueError('Spatially averaged CSV exports do not support custom bounding boxes')
    if request.bbox:
        parse_bbox(request.bbox)
    return WizardResponse(available=True, dataset=dataset,
        selection=Selection(dataset_id=dataset.id, start=start, end=end, bbox=request.bbox),
        explanation='Selection checked against the installed dataset catalog. Scientific review remains pending.')


@router.post('/verdict', response_model=Verdict)
def verdict(request: Selection):
    return Investigations().analyze(**request.model_dump()).verdict


@router.post('/years-to-significance', response_model=YearsEstimate)
def years(request: Selection):
    return Investigations().analyze(**request.model_dump()).years_to_significance


class ComparisonRequest(StrictRequest):
    topic: str = 'temperature'
    left_location: str = 'karachi'
    right_location: str = 'lahore'
    start: date | None = None
    end: date | None = None
    run: bool = False


class ComparisonResponse(ScientificModel):
    available: bool
    reason: str | None = None
    left_dataset: CsvDataset | None = None
    right_dataset: CsvDataset | None = None
    start: str | None = None
    end: str | None = None
    left: CsvAnalysis | None = None
    right: CsvAnalysis | None = None


@router.post('/comparison', response_model=ComparisonResponse)
def comparison(request: ComparisonRequest):
    service = Investigations()
    datasets = service.catalog()
    left = next((d for d in datasets if d.topic == request.topic and d.location_id == request.left_location), None)
    right = next((d for d in datasets if d.topic == request.topic and d.location_id == request.right_location), None)
    base = {'left_dataset': left, 'right_dataset': right}
    if request.left_location == request.right_location:
        return ComparisonResponse(available=False, reason='Choose two different locations for comparison.', **base)
    if left is None or right is None:
        missing = request.left_location if left is None else request.right_location
        return ComparisonResponse(available=False, reason=f'{missing.title()} is awaiting a compatible dataset.', **base)
    fields = ('units', 'dataset_id', 'version', 'source_variable', 'provenance', 'data_kind')
    if not left.dataset_id or not left.version or not left.source_variable or any(
            getattr(left, field) != getattr(right, field) for field in fields):
        return ComparisonResponse(available=False,
            reason='Comparison needs matching product, version, source variable (including soil depth) and units.', **base)
    first = max(left.temporal_coverage[0], right.temporal_coverage[0])
    last = min(left.temporal_coverage[1], right.temporal_coverage[1])
    if first > last:
        return ComparisonResponse(available=False, reason='Dataset periods do not overlap.', **base)
    start = pd.Period(request.start or first, freq='M').start_time.date()
    end = pd.Period(request.end or last, freq='M').start_time.date()
    if str(start) < first or str(end) > last or start > end:
        raise ValueError('Comparison dates must be within the shared dataset coverage')
    if not request.run:
        return ComparisonResponse(available=True, start=str(start), end=str(end), **base)
    return ComparisonResponse(available=True, start=str(start), end=str(end),
        left=service.analyze(left.id, start, end), right=service.analyze(right.id, start, end), **base)


class PreparedCase(ScientificModel):
    id: str
    title: str
    available: bool
    validated: bool = False
    message: str


@cases_router.get('/cases', response_model=list[PreparedCase])
def cases():
    result = []
    # Keep the current public selection focused on the retained source work.
    # Legacy Amazon artifacts remain readable through /demo for compatibility.
    for case, title in [('sahel', 'Sahel precipitation'), ('arctic', 'Arctic temperature')]:
        try:
            prepared = demo(case)
            result.append(PreparedCase(id=case, title=title, available=prepared.available,
                validated=prepared.validated, message=prepared.message))
        except HTTPException:
            result.append(PreparedCase(id=case, title=title, available=False,
                message='Prepared artifact could not be validated; check it before use.'))
    return result
