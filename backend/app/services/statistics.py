"""Exploratory monthly trend analysis; no interpolation or causal inference."""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy.stats import theilslopes

from app.models.schemas import Point, TrendResult

MAX_MONTHS = 600


def monthly_series(series: pd.Series) -> pd.Series:
    if not isinstance(series.index, pd.DatetimeIndex) or series.index.hasnans:
        raise ValueError('A valid DatetimeIndex is required')
    if series.index.tz is not None:
        raise ValueError('Use timezone-naive monthly timestamps')
    if len(series) == 0:
        raise ValueError('No observations')
    if not series.index.is_monotonic_increasing or series.index.has_duplicates:
        raise ValueError('Expected sorted, unique timestamps')
    periods = series.index.to_period('M')
    if periods.has_duplicates or not periods.is_monotonic_increasing:
        raise ValueError('Expected sorted, unique monthly observations')
    full = pd.period_range(periods[0], periods[-1], freq='M')
    if len(full) > MAX_MONTHS:
        raise ValueError(f'At most {MAX_MONTHS} months supported per request')
    values = pd.to_numeric(series, errors='raise').to_numpy(dtype=float)
    if np.isinf(values).any():
        raise ValueError('Infinite observations are invalid')
    return pd.Series(values, index=periods).reindex(full)


def points(series: pd.Series) -> list[Point]:
    return [Point(time=str(t), value=float(v) if np.isfinite(v) else None)
            for t, v in series.items()]


def annual_values(series: pd.Series, aggregation: str = 'mean') -> pd.Series:
    """Only complete 12-month years; sums require additive monthly units."""
    grouped = series.groupby(series.index.year)
    values = grouped.sum(min_count=12) if aggregation == 'sum' else grouped.mean()
    return values.where(grouped.count() == 12).dropna()


def significance(annual: pd.Series) -> tuple[float | None, str | None]:
    if len(annual) < 10:
        return None, 'At least 10 complete years are required for significance'
    if np.any(np.diff(annual.index.to_numpy()) != 1):
        return None, 'Nonconsecutive complete years: significance withheld, no gap compression'
    if np.ptp(annual.to_numpy()) < 1e-12:
        return 1.0, None
    x = annual.index.to_numpy(dtype=float)
    fit = theilslopes(annual.to_numpy(), x)
    residual = annual.to_numpy() - (fit.intercept + fit.slope*x)
    if np.ptp(residual) < 1e-10:
        # Rank autocorrelation is undefined for a constant detrended residual.
        # No estimated correlation to inflate; disclose this degenerate case.
        return float(mk.original_test(annual.to_numpy()).p), (
            'Zero detrended residual variance: annual MK used without variance inflation')
    # Significant rank autocorrelations at lags 1..3, on detrended annual data.
    result = mk.hamed_rao_modification_test(annual.to_numpy(), lag=min(3, len(annual)-1))
    if not np.isfinite(result.p) or result.var_s <= 0:
        return None, 'Unstable autocorrelation variance correction: significance withheld'
    return float(result.p), None


def analyze(series: pd.Series, units: str) -> TrendResult:
    if not units.strip():
        raise ValueError('Units are required')
    s = monthly_series(series)
    good = s.notna().to_numpy()
    coverage = float(good.mean())
    if good.sum() < 60 or len(s) < 60 or coverage < .8:
        raise ValueError('Need at least 60 finite months and 80% monthly coverage')
    if (s.groupby(s.index.month).count() < 3).any() or len(set(s.index.month)) != 12:
        raise ValueError('Need at least three observations for every calendar month')
    x = np.arange(len(s), dtype=float) / 12
    y = s.to_numpy()
    # Preliminary slope from same-calendar-month pairs avoids seasonal slope bias.
    slopes = []
    for month in range(1, 13):
        indices = np.flatnonzero(good & (s.index.month == month))
        a, b = np.triu_indices(len(indices), 1)
        slopes.extend(((y[indices[b]] - y[indices[a]]) /
                       (x[indices[b]] - x[indices[a]])).tolist())
    initial = float(np.median(slopes))
    detrended = pd.Series(y - initial * x, index=s.index)
    seasonal = detrended.groupby(s.index.month).median()
    seasonal -= seasonal.mean()
    adjusted = y - seasonal.loc[s.index.month].to_numpy()
    fit = theilslopes(adjusted[good], x[good], method='joint')
    line = fit.intercept + fit.slope * x
    # Circular residual moving-block bootstrap: preserves within-year dependence.
    # Missing months are never filled: block CI requires complete monthly coverage.
    warnings = ['Exploratory association only; trends do not establish causation.',
                'Regional means can vary with the set of finite cells each month.']
    if good.all():
        residual = adjusted - line
        rng = np.random.default_rng(2026)
        boot = []
        n = len(s)
        for _ in range(199):
            starts = rng.integers(0, n, size=int(np.ceil(n / 12)))
            idx = ((starts[:, None] + np.arange(12)) % n).ravel()[:n]
            boot.append(theilslopes(line + residual[idx], x).slope)
        low, high = np.quantile(boot, [.025, .975])
        ci_method = '199 circular residual block bootstraps, block=12 months, seed=2026'
    else:
        low, high = fit.low_slope, fit.high_slope
        ci_method = 'Sen 95% rank interval on observed months (independence approximation)'
        warnings.append('Missing months retained as null; CI is not adjusted for autocorrelation.')
    annual = annual_values(pd.Series(adjusted, index=s.index))
    p, warning = significance(annual)
    if warning:
        warnings.append(warning)
    significant = p is not None and p < .05
    direction = ('increasing' if fit.slope > 0 else 'decreasing') if significant else 'no_significant_trend'
    return TrendResult(direction=direction, significant=significant, p_value=p,
        slope=float(fit.slope*10), ci_low=float(low*10), ci_high=float(high*10),
        slope_units=f'{units} per decade', years=len(s)/12, samples=int(good.sum()),
        coverage=coverage, raw=points(s),
        deseasonalized=points(pd.Series(adjusted, index=s.index)),
        trend_line=points(pd.Series(line, index=s.index)),
        methods={'slope': 'Theil-Sen against elapsed calendar months / 12',
                 'seasonality': 'Calendar-month medians after preliminary seasonal Sen detrending; centered climatology',
                 'ci': ci_method,
                 'significance': 'Hamed-Rao modified Mann-Kendall on complete annual deseasonalized means; lags 1..3; alpha=.05'},
        warnings=warnings)
