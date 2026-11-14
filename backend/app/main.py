import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
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
