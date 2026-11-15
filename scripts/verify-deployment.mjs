import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { frontend: { type: 'string' }, api: { type: 'string' } } });
if (!values.frontend || !values.api) {
  throw new Error('Usage: npm run verify:deployment -- --frontend https://your-site.pages.dev --api https://your-backend.onrender.com/api');
}
const frontend = new URL(values.frontend);
const api = new URL(values.api.replace(/\/$/, '') + '/');
for (const url of [frontend, api]) {
  assert(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash,
    'Supply plain HTTP(S) URLs without credentials, queries or fragments');
}
assert.equal(api.pathname, '/api/', 'The API URL must end in /api');
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(45000) });
const json = async path => {
  const response = await request(new URL(path, api));
  assert(response.ok, `${path}: HTTP ${response.status}`);
  assert(response.headers.get('content-type')?.includes('application/json'), `${path}: expected JSON, not a static-host HTML fallback`);
  return response.json();
};
assert.equal((await json('health')).status, 'ok');
const datasets = await json('datasets');
assert(Array.isArray(datasets) && datasets.length >= 6, 'Expected the six supplied Karachi datasets');
assert(datasets.every(d => d.provenance !== 'mock' && d.data_kind !== 'synthetic'), 'Do not deploy E2E synthetic fixtures');
const precipitation = datasets.find(d => d.id === 'karachi_precipitation');
assert(precipitation?.source_sha256 && precipitation.units === 'mm/hr' && precipitation.source_units === 'inch/day', 'Precipitation must use mm/hr while preserving original source units and fingerprint');
assert(Math.abs(precipitation.unit_conversion?.factor - 25.4 / 24) < 1e-12, 'Karachi conversion must be explicitly recorded');
const analysis = await json('datasets/karachi_precipitation/analysis?start=2006-01-01&end=2015-12-01');
assert.equal(analysis.series.length, 120);
assert.equal(analysis.dataset.provenance, 'source_export');
assert(analysis.trend && analysis.summary && analysis.warnings.length, 'Expected real backend analysis with caveats');
assert.equal(analysis.feature_status.paradox.available, false, 'City averages must not acquire a fabricated spatial grid');
const preflight = await request(new URL('wizard', api), { method: 'OPTIONS', headers: {
  Origin: frontend.origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
} });
assert.equal(preflight.status, 200, 'Backend must accept the frontend CORS preflight');
assert.equal(preflight.headers.get('access-control-allow-origin'), frontend.origin);
const forbidden = await request(new URL('datasets', api), { headers: { Origin: 'https://unrelated-origin.invalid' } });
assert.equal(forbidden.headers.get('access-control-allow-origin'), null, 'Do not enable wildcard CORS');
let scriptUrl;
for (const route of ['/', '/wizard', '/lab', '/cases', '/compare']) {
  const response = await request(new URL(route, frontend));
  assert(response.ok && response.headers.get('content-type')?.includes('text/html'), `${route}: direct SPA link must serve HTML`);
  const html = await response.text();
  assert(html.includes('id="root"'), `${route}: expected the React app`);
  const script = html.match(/<script\b[^>]*\bsrc="([^"]+)"/i)?.[1];
  assert(script, `${route}: missing application bundle`);
  scriptUrl ??= new URL(script, frontend);
}
const script = await request(scriptUrl);
assert(script.ok && /javascript/.test(script.headers.get('content-type') || ''), 'Built JavaScript must be served as JavaScript');
const bundle = await script.text();
assert(bundle.includes(api.href.replace(/\/$/, '')), 'Frontend bundle must point to the verified backend API');
console.log('Deployment checks passed: frontend routes/assets, real Karachi analysis, source metadata, and explicit CORS.');
