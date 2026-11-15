"""Expose the existing FastAPI app from a self-contained deployment package."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'backend'))

from app.main import app  # noqa: E402,F401
