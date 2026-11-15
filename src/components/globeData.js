const displayNumber = value => Number(value).toLocaleString(undefined, { maximumSignificantDigits: 5 });

export function summarizeCity(datasets, cityId) {
  const records = datasets.filter(dataset => dataset.location_id === cityId);
  const dates = records.flatMap(dataset => dataset.temporal_coverage).filter(Boolean).sort();
  const products = [...new Set(records.map(dataset => {
    const id = dataset.dataset_id || '';
    if (id.startsWith('M2')) return 'MERRA-2';
    if (id.startsWith('GPM')) return 'IMERG';
    if (id.startsWith('GLDAS')) return 'GLDAS';
    if (id.startsWith('MOD')) return 'MODIS';
    return id || 'Source export';
  }))];
  const metric = topic => {
    const dataset = records.find(record => record.topic === topic);
    const point = dataset?.latest_record;
    const valid = typeof point?.value === 'number' && Number.isFinite(point.value);
    const units = dataset?.units === 'dimensionless' ? '' : dataset?.units || '';
    return {
      value: valid ? `${displayNumber(point.value)}${units ? ` ${units}` : ''}` : 'Not available',
      period: point?.time ? point.time.slice(0, 7) : 'No monthly value',
    };
  };
  return {
    count: records.length,
    products: products.join(' · ') || 'No source records',
    coverage: dates.length ? `${dates[0].slice(0, 7)} – ${dates.at(-1).slice(0, 7)}` : 'No coverage available',
    temperature: metric('temperature'), precipitation: metric('precipitation'), ndvi: metric('ndvi'),
  };
}
