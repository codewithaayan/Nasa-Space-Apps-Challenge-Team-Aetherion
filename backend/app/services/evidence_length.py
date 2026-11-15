"""Retrospective evidence from observed record prefixes, never a forecast."""
from app.models.csv_datasets import HistoricalPrefix, YearsEstimate
from app.services.statistics import annual_values, monthly_series, significance


def evidence_length(raw):
    annual = annual_values(monthly_series(raw))
    prefixes = []
    for length in range(10, len(annual) + 1):
        prefix = annual.iloc[:length]
        p, warning = significance(prefix)
        prefixes.append(HistoricalPrefix(complete_years=length,
            start_year=int(prefix.index[0]), end_year=int(prefix.index[-1]),
            p_value=p, warning=warning))
    # BY controls FDR across arbitrarily dependent, nested prefix tests.
    tests = sorted((p for p in prefixes if p.p_value is not None), key=lambda p: p.p_value)
    count = len(tests)
    harmonic = sum(1 / rank for rank in range(1, count + 1))
    previous = 1.0
    for rank in range(count, 0, -1):
        item = tests[rank - 1]
        previous = min(previous, item.p_value * count * harmonic / rank)
        item.adjusted_p_value = previous
        item.significant = previous < .05
    first = next((p.complete_years for p in prefixes if p.significant), None)
    return YearsEstimate(observed_complete_years=len(annual),
        historical_years_to_significance=first, historical_prefixes=prefixes,
        method='Annual modified Mann-Kendall on expanding historical prefixes; Benjamini-Yekutieli FDR q=.05 across testable prefixes',
        assumptions=['Only years with 12 finite monthly values are used.',
            'Each prefix starts at the first complete selected year; at least 10 consecutive years are required.',
            'Tests use equal-month annual means, not annual accumulated rainfall.'],
        warnings=['Historical evidence only, not a forecast of future significance; no future values are simulated.',
            'The first supported prefix is not a guaranteed minimum; significance can be lost later.',
            'Correction for repeated prefix tests is stricter than a single full-record test; labels may differ.',
            'Results depend on the selected start, data quality and statistical assumptions; exploratory and unreviewed.'])
