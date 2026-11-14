from datetime import date

from fastapi import APIRouter

from app.models.csv_datasets import CsvAnalysis, CsvDataset
from app.services.investigations import Investigations

router = APIRouter()


@router.get('/datasets', response_model=list[CsvDataset])
def datasets(location: str | None = None):
    return Investigations().catalog(location)


@router.get('/datasets/{dataset_id}/analysis', response_model=CsvAnalysis)
def dataset_analysis(dataset_id: str, start: date | None = None, end: date | None = None,
                     bbox: str | None = None):
    return Investigations().analyze(dataset_id, start, end, bbox)
