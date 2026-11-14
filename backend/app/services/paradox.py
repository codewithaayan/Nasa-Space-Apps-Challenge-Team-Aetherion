import numpy as np
import pandas as pd
from scipy.stats import theilslopes

from app.models.schemas import Cell, ParadoxResponse
from app.services.statistics import monthly_series, annual_values, significance


def find_paradox(meta, da, box) -> ParadoxResponse:
    cells = []
    for latitude in da.latitude.values:
        for longitude in da.longitude.values:
            cell = Cell(latitude=float(latitude), longitude=float(longitude), label=None,
                        slope=None, p_value=None, significant=False, valid_years=0)
            try:
                s = monthly_series(da.sel(latitude=latitude, longitude=longitude).to_series())
            except ValueError as exc:
                cell.warning = str(exc)
                cells.append(cell)
                continue
            if meta.annual_aggregation == 'sum' and '/' in meta.units:
                raise ValueError('Annual sum requires additive monthly amounts, not rate units')
            annual = annual_values(s, meta.annual_aggregation)
            cell.valid_years = len(annual)
            if len(annual) < 10:
                cell.warning = 'Fewer than 10 complete years'
            else:
                fit = theilslopes(annual.values, annual.index.to_numpy())
                cell.slope = float(fit.slope*10)
                cell.p_value, cell.warning = significance(annual)
                if cell.p_value is not None:
                    cell.label = 0
            cells.append(cell)
    # Benjamini-Yekutieli controls FDR under arbitrary spatial dependence.
    eligible = [c for c in cells if c.p_value is not None]
    m = len(eligible)
    cutoff = -1.0
    harmonic = sum(1/i for i in range(1, m+1))
    for rank, cell in enumerate(sorted(eligible, key=lambda c: c.p_value), 1):
        if cell.p_value <= .05 * rank / (m * harmonic):
            cutoff = cell.p_value
    for cell in eligible:
        cell.significant = cell.p_value <= cutoff
        cell.label = int(np.sign(cell.slope)) if cell.significant else 0
    inc = sum(c.label == 1 for c in eligible)
    dec = sum(c.label == -1 for c in eligible)
    latitudes = da.latitude.values.tolist()
    longitudes = da.longitude.values.tolist()
    width = len(longitudes)
    def matrix(field):
        values = [getattr(c, field) for c in cells]
        return [values[i:i+width] for i in range(0, len(values), width)]
    return ParadoxResponse(variable=meta, bbox=box, cells=cells,
        latitudes=latitudes, longitudes=longitudes, labels=matrix('label'),
        slopes=matrix('slope'), p_values=matrix('p_value'),
        opposing_trends=m > 0 and inc/m >= .1 and dec/m >= .1,
        increasing_proportion=inc/m if m else 0, decreasing_proportion=dec/m if m else 0,
        valid_cells=m, slope_units=f'{meta.units} per decade',
        methods={'annual': f'12 finite months required; {meta.annual_aggregation}; incomplete years discarded',
                 'slope': 'Theil-Sen against actual calendar year',
                 'significance': 'Hamed-Rao annual Mann-Kendall; lags 1..3; >=10 consecutive years',
                 'multiple_testing': 'Benjamini-Yekutieli FDR q=.05 over testable cells',
                 'paradox': 'At least 10% of testable cells in each FDR-supported direction',
                 'proportions': 'Unweighted cell counts divided by testable cells; not land-area fractions'},
        warnings=['Exploratory screening, not causal inference; no spatial clustering requirement.',
                  'Annual sum is supported only for additive monthly amounts.'])
