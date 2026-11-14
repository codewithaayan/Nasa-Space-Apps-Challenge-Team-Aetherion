import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.api.csv_datasets import router as csv_router
from app.api.investigations import router as investigations_router
from app.api.investigations import cases_router
from app.services.data import DataUnavailable, NotFound

app = FastAPI(title='Trend Detective: Case Files', version='0.1.0')
origins = [v.strip() for v in os.getenv('ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173').split(',') if v.strip()]
if '*' in origins:
    raise RuntimeError('Configure explicit ALLOWED_ORIGINS; wildcard is not supported')
app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])


@app.exception_handler(ValueError)
async def invalid_request(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={'detail': str(exc)})


@app.exception_handler(DataUnavailable)
async def unavailable(request: Request, exc: DataUnavailable):
    return JSONResponse(status_code=503, content={'detail': str(exc)})


@app.exception_handler(NotFound)
async def not_found(request: Request, exc: NotFound):
    return JSONResponse(status_code=404, content={'detail': str(exc)})


@app.get('/health')
def health():
    return {'status': 'ok'}


app.include_router(router)
app.include_router(csv_router)
app.include_router(investigations_router)

# /api is the same-origin frontend contract. Original root routes stay available.
app.include_router(router, prefix='/api')
app.include_router(csv_router, prefix='/api')
app.include_router(investigations_router, prefix='/api')
app.include_router(cases_router, prefix='/api')
app.add_api_route('/api/health', health, methods=['GET'])

DIST = Path(__file__).resolve().parents[2] / 'dist'
app.mount('/assets', StaticFiles(directory=str(DIST / 'assets'), check_dir=False), name='assets')


@app.get('/{path:path}', include_in_schema=False)
def frontend(path: str):
    if path and path.split('/')[0] not in {'wizard', 'lab', 'cases', 'compare', 'about'}:
        return JSONResponse(status_code=404, content={'detail': 'Not found'})
    index = DIST / 'index.html'
    if not index.is_file():
        return JSONResponse(status_code=503, content={'detail': 'Build the frontend with npm run build first'})
    return FileResponse(index)
