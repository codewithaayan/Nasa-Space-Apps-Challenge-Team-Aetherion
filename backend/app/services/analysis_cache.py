from functools import lru_cache

import numpy as np
import pandas as pd

from app.services.statistics import analyze


@lru_cache(maxsize=16)
def _analyze(times: bytes, values: bytes, units: str):
    series = pd.Series(np.frombuffer(values, dtype=np.float64),
                       index=pd.DatetimeIndex(np.frombuffer(times, dtype=np.int64)))
    return analyze(series, units)


def cached_analyze(series: pd.Series, units: str):
    # Cache actual values/timestamps, not file names: changed data cannot return stale results.
    result = _analyze(series.index.as_unit('ns').asi8.tobytes(),
                      series.to_numpy(dtype=np.float64).tobytes(), units)
    return result.model_copy(deep=True)
