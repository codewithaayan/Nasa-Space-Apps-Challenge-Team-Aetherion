import json
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import (DemoResponse, ParadoxResponse, SeriesResponse,
                                TrendResponse, Variable)
from app.services.data import LocalDataSource, data_root, regional_series
from app.services.geo import parse_bbox
from app.services.paradox import find_paradox
from app.services.statistics import analyze, monthly_series, points
from app.services.analysis_cache import cached_analyze

router = APIRouter()


def source():
    return LocalDataSource()


def selection(var: str, bbox: str, start: date | None = None, end: date | None = None,
              provider: LocalDataSource = Depends(source)):
    box = parse_bbox(bbox)
    meta, da = provider.load(var, box, start, end)
    return meta, da, box


Selection = Annotated[tuple, Depends(selection)]


@router.get('/variables', response_model=list[Variable])
def variables(provider: LocalDataSource = Depends(source)):
    return provider.catalog()


@router.get('/timeseries', response_model=SeriesResponse)
def timeseries(selected: Selection):
    meta, da, box = selected
    raw = regional_series(da)
    monthly = monthly_series(raw)
    warnings = ['Monthly spatial support may vary; no interpolation.'] + meta.limitations
    if meta.provenance == 'mock':
        warnings.append('Synthetic data, NOT NASA observations.')
    try:
        analysis = cached_analyze(raw, meta.units)
    except ValueError as exc:
        analysis = None
        warnings.append(f'Chart analysis unavailable: {exc}')
    return SeriesResponse(variable=meta, bbox=box, series=points(monthly),
        deseasonalized=analysis.deseasonalized if analysis else [],
        trend_line=analysis.trend_line if analysis else [], analysis_available=analysis is not None,
        coverage={'start':str(monthly.index[0]), 'end':str(monthly.index[-1]),
                  'finite_months':int(monthly.notna().sum()), 'monthly_fraction':float(monthly.notna().mean()),
                  'latitude_cells':da.sizes['latitude'], 'longitude_cells':da.sizes['longitude']},
        warnings=warnings + (analysis.warnings if analysis else []))


@router.get('/trend', response_model=TrendResponse)
def trend(selected: Selection):
    meta, da, box = selected
    result = cached_analyze(regional_series(da), meta.units)
    result.warnings.extend(meta.limitations)
    return TrendResponse(variable=meta, bbox=box, result=result)


@router.get('/paradox', response_model=ParadoxResponse)
def paradox(selected: Selection):
    meta, da, box = selected
    return find_paradox(meta, da, box)


@router.get('/demo/{case}', response_model=DemoResponse)
def demo(case: str):
    if case not in {'sahel', 'amazon', 'arctic'}:
        raise HTTPException(404, 'Unknown demo case')
    path = data_root() / 'demos' / f'{case}.json'
    if not path.exists():
        messages = {
            'sahel': 'The prepared Sahel rainfall report is not yet available. The bundled western Sahel grid can be explored as an investigation; scientific review is pending.',
            'arctic': 'The Arctic temperature report is being prepared. Existing data is a point sample at 70°N, 20°E, not an Arctic-wide study.',
            'amazon': 'This regional report is not available.',
        }
        return DemoResponse(case=case, available=False, provenance='unavailable',
                            message=messages[case])
    try:
        if not path.resolve().is_relative_to(data_root()) or path.stat().st_size > 5_000_000:
            raise ValueError('Unsafe or oversized prepared demo')
        result = DemoResponse.model_validate(json.loads(path.read_text()))
        if (result.case != case or not result.available or result.result is None
                or result.provenance == 'unavailable' or not result.source
                or result.result.variable.provenance != result.provenance
                or (result.validated and not result.validated_by)):
            raise ValueError('Incomplete provenance or validation metadata')
        for section in (result.timeseries, result.trend, result.paradox):
            if section is not None and (section.variable.provenance != result.provenance
                                        or section.variable.id != result.result.variable.id):
                raise ValueError('Demo sections have inconsistent provenance or variables')
        return result
    except (ValueError, OSError) as exc:
        raise HTTPException(503, 'Invalid precomputed demo artifact') from exc
