import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, ClipboardList, Download, Layers3, MapPin, Play } from 'lucide-react';
import { api } from '../api/client';
import { locations, variables } from '../data';
import { Eyebrow, StatusNotice } from '../components/Layout';
import { PageArtwork, TopicArtwork } from '../components/Artwork';
import { MapPanel } from '../components/MapPanel';
import { TrendChart } from '../components/TrendChart';

const Catalog = createContext(null);
function errorMessage(error) {
  if (error.response) return typeof error.response.data?.detail === 'string' ? error.response.data.detail : 'The service rejected the request. Check the selected dataset and dates.';
  return 'Cannot reach the analysis service. Check that the backend is running and the API address is configured.';
}
export function CatalogProvider({ children }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [preparedCases, setPreparedCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.allSettled([api.getDatasets(), api.getCases()]).then(([catalog, cases]) => {
      if (!active) return;
      if (catalog.status === 'fulfilled') setDatasets(catalog.value.data);
      else { setDatasets([]); setError(errorMessage(catalog.reason)); }
      if (cases.status === 'fulfilled') { setPreparedCases(cases.value.data); setCasesError(''); }
      else { setPreparedCases([]); setCasesError(errorMessage(cases.reason)); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [revision]);
  const places = [...locations];
  const topics = [...variables];
  for (const dataset of datasets) {
    if (!places.some(p => p.id === dataset.location_id)) places.push({ id: dataset.location_id, name: dataset.location_id === 'region' ? 'Dataset region' : dataset.location_id, province: 'Source-defined region' });
    if (!topics.some(t => t.id === dataset.topic)) topics.push({ id: dataset.topic, name: dataset.name, description: 'A variable from the installed dataset catalog.' });
  }
  return <Catalog.Provider value={{ datasets, places, topics, preparedCases, casesError, loading, error, reload: () => setRevision(x => x + 1) }}>{children}</Catalog.Provider>;
}
export const useCatalog = () => useContext(Catalog);
const month = date => date?.slice(0, 7) || '';
const bounds = dataset => dataset ? dataset.temporal_coverage.map(month) : ['', ''];
const dateParams = (start, end, bbox = '') => ({ ...(start ? { start: `${start}-01` } : {}), ...(end ? { end: `${end}-01` } : {}), ...(bbox ? { bbox } : {}) });
const number = value => value == null ? 'Unavailable' : Number(value).toLocaleString(undefined, { maximumSignificantDigits: 5 });
const kindLabel = kind => ({ reanalysis: 'Reanalysis', model: 'Model output', satellite_estimate: 'Satellite-derived estimate', observation: 'Observations', synthetic: 'Synthetic fixture' }[kind] || kind || 'Not specified');
const direction = result => !result ? 'Unavailable' : result.p_value == null ? 'Inference unavailable' : result.significant ? result.direction === 'increasing' ? 'Increasing' : 'Decreasing' : 'No supported trend';

function CatalogStatus() {
  const { loading, error, datasets, reload } = useCatalog();
  if (loading) return <StatusNotice>Reading dataset coverage…</StatusNotice>;
  if (error) return <div className="inline-error" role="alert">{error} <button className="button button-secondary" onClick={reload}>RETRY CONNECTION</button></div>;
  if (!datasets.length) return <StatusNotice>No datasets are registered. Configure a CSV manifest or the gridded data catalog.</StatusNotice>;
  return null;
}
function DateFields({ dataset, start, end, onStart, onEnd }) {
  const [first, last] = bounds(dataset);
  return <div className="date-fields"><label className="control-field"><span>START MONTH</span><input aria-label="Start month" type="month" value={start} min={first} max={end || last} disabled={!dataset} onChange={e => onStart(e.target.value)} /></label><label className="control-field"><span>END MONTH</span><input aria-label="End month" type="month" value={end} min={start || first} max={last} disabled={!dataset} onChange={e => onEnd(e.target.value)} /></label></div>;
}
function selectionError(dataset, start, end) {
  if (!dataset) return 'This variable and location are awaiting a dataset.';
  const [first, last] = bounds(dataset);
  if (!start || !end) return 'Choose both a start and an end month.';
  if (start > end) return 'Start month must be on or before end month.';
  if (start < first || end > last) return `Available coverage is ${first} to ${last}.`;
  return '';
}

export function Wizard() {
  const navigate = useNavigate();
  const state = useLocation().state;
  const { datasets, places, topics } = useCatalog();
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(state?.topic || 'temperature');
  const [place, setPlace] = useState(state?.locationId || 'karachi');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [message, setMessage] = useState('');
  const dataset = datasets.find(d => d.topic === topic && d.location_id === place);
  const selectedVariable = topics.find(v => v.id === topic);
  const selectedLocation = places.find(l => l.id === place);
  const [submitting, setSubmitting] = useState(false);
  const begin = async () => {
    setSubmitting(true); setMessage('');
    try {
      const { data } = await api.submitWizard({ dataset_id: dataset?.id, location: place, topic, ...dateParams(start,end) });
      if (!data.available) { setMessage(data.explanation); return; }
      const selection = data.selection;
      navigate('/lab?' + new URLSearchParams({ dataset: selection.dataset_id, start: month(selection.start), end: month(selection.end) }).toString());
    } catch (e) { setMessage(errorMessage(e)); }
    finally { setSubmitting(false); }
  };
  useEffect(() => { const [a,b] = bounds(dataset); setStart(a); setEnd(b); setMessage(''); }, [dataset?.id]);
  const advance = () => {
    if (step >= 2) { const error = selectionError(dataset,start,end); if (error) { setMessage(error); return; } }
    setMessage(''); setStep(s => Math.min(3,s + 1));
  };
  return <div className="page-wrap page-content">
    <div className="page-title-row"><div><Eyebrow>INVESTIGATION SETUP / NEW CASE</Eyebrow><h1>Build your investigation.</h1><p>Choose a question, then use the coverage available in its source export.</p></div><PageArtwork variant="wizard" /></div>
    <CatalogStatus />
    <div className="wizard-progress">{['TOPIC','LOCATION','TIME PERIOD','REVIEW'].map((label,i) => <div className={`wizard-step ${step === i ? 'active' : ''} ${step > i ? 'complete' : ''}`} key={label}><span>{step > i ? <Check size={14} /> : `0${i + 1}`}</span><b>{label}</b>{i < 3 && <i />}</div>)}</div>
    <div className="wizard-layout"><div className="wizard-main">
      {step === 0 && <><div className="wizard-heading"><h2>What do you want to investigate?</h2><p>All planned topics remain available. Data availability is checked for the selected location.</p></div><div className="variable-grid">{topics.map(v => <button key={v.id} className={`variable-option ${topic === v.id ? 'selected' : ''}`} onClick={() => setTopic(v.id)}><TopicArtwork variable={v.id} /><b>{v.name}</b><span>{v.description}</span></button>)}</div></>}
      {step === 1 && <><div className="wizard-heading"><h2>Choose your investigation area.</h2></div><div className="location-options">{places.map(l => <button key={l.id} className={`location-option ${place === l.id ? 'selected' : ''}`} onClick={() => setPlace(l.id)}><MapPin size={22} /><b>{l.name}</b><small>{datasets.some(d => d.location_id === l.id && d.topic === topic) ? 'Source export available · unreviewed' : 'Awaiting dataset'}</small></button>)}</div><MapPanel activeLocation={place} dataset={dataset} height="230px" compact /></>}
      {step === 2 && <><div className="wizard-heading"><h2>Choose the time period.</h2><p>{dataset ? `Actual source coverage: ${bounds(dataset).join(' to ')}. Short selections can show source values even when trend inference is unavailable.` : 'This location and variable are awaiting data. The feature remains planned.'}</p></div><DateFields dataset={dataset} start={start} end={end} onStart={setStart} onEnd={setEnd} />{dataset && <div className="period-actions"><button className="button button-secondary" onClick={() => { const [a,b] = bounds(dataset); setStart(a); setEnd(b); }}>FULL AVAILABLE RECORD</button><button className="button button-secondary" disabled={dataset.monthly_slots < 120} onClick={() => { const [year,m] = bounds(dataset)[1].split('-').map(Number); setStart(new Date(Date.UTC(year,m - 120,1)).toISOString().slice(0,7)); setEnd(bounds(dataset)[1]); }}>LAST 10 YEARS</button></div>}</>}
      {step === 3 && <><div className="wizard-heading"><h2>Review your case.</h2></div><Evidence label="VARIABLE" value={dataset?.name} /><Evidence label="LOCATION" value={selectedLocation?.name} /><Evidence label="PERIOD" value={`${start} to ${end}`} /><Evidence label="UNIT" value={dataset?.units} /><Evidence label="SOURCE TYPE" value={kindLabel(dataset?.data_kind)} /><Evidence label="REVIEW" value="Scientifically unreviewed" /><p className="source-description">{dataset?.spatial_support}</p></>}
      {message && <div className="inline-error" role="alert">{message}</div>}
      <div className="wizard-footer">{step ? <button className="button button-secondary" onClick={() => { setStep(s => s - 1); setMessage(''); }}><ChevronLeft size={16} />BACK</button> : <span />}{step < 3 ? <button className="button button-primary" onClick={advance}>CONTINUE<ChevronRight size={16} /></button> : <button className="button button-primary" disabled={submitting || !!selectionError(dataset,start,end)} onClick={begin}>BEGIN INVESTIGATION<ArrowRight size={16} /></button>}</div>
    </div><aside className="wizard-side"><Eyebrow>CASE PREVIEW</Eyebrow><h3>{dataset?.name || selectedVariable?.name}</h3><p>{selectedLocation?.name}</p><div className="side-info"><span>COVERAGE</span><b>{dataset ? bounds(dataset).join(' – ') : 'Awaiting dataset'}</b></div><div className="side-info"><span>UNITS</span><b>{dataset?.units || 'Pending source'}</b></div><div className="side-info"><span>REVIEW STATUS</span><b>Unreviewed</b></div></aside></div>
  </div>;
}

function useAnalysis(dataset, start, end, auto = false, bbox = '') {
  const [result,setResult] = useState(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const active = useRef({ sequence:0, controller:null });
  const run = useCallback(async () => {
    active.current.controller?.abort();
    const sequence = ++active.current.sequence;
    const message = selectionError(dataset,start,end);
    setResult(null); setError(message); setLoading(false);
    if (message) return;
    const controller = new AbortController(); active.current.controller = controller;
    setLoading(true);
    try {
      const { data } = await api.getDatasetAnalysis(dataset.id,dateParams(start,end,bbox),controller.signal);
      if (sequence === active.current.sequence) setResult(data);
    } catch (e) { if (sequence === active.current.sequence && !controller.signal.aborted) setError(errorMessage(e)); }
    finally { if (sequence === active.current.sequence) setLoading(false); }
  }, [dataset?.id,dataset?.source_sha256,dataset?.source_revision,start,end,bbox]);
  useEffect(() => {
    active.current.controller?.abort(); active.current.sequence++;
    setResult(null); setError(''); setLoading(false);
    if (auto && dataset) run();
    return () => { active.current.controller?.abort(); active.current.sequence++; };
  }, [run,auto]);
  return { result,error,loading,run };
}
function Evidence({ label,value }) { return <div className="evidence-row"><span>{label}</span><b>{value ?? 'Unavailable'}</b></div>; }
function Warnings({ items = [] }) { return <ul className="limitations-list source-warnings">{[...new Set(items)].map(item => <li key={item}>{item}</li>)}</ul>; }
function Statistics({ result }) {
  const trend = result?.trend;
  return <section className="panel stats-panel"><div className="panel-heading"><div><span className="panel-index">STATISTICAL FINDINGS</span><h2>What does the evidence say?</h2></div><span className="status-chip">{trend ? 'EXPLORATORY' : 'INFERENCE UNAVAILABLE'}</span></div><div className="stats-grid">{[
    ['RATE OF CHANGE',number(trend?.slope),trend?.slope_units || 'Source units per decade'],
    ['P-VALUE',number(trend?.p_value),'Annual modified Mann–Kendall'],
    ['95% CONFIDENCE INTERVAL',trend ? `${number(trend.ci_low)} to ${number(trend.ci_high)}` : 'Unavailable',trend?.slope_units || 'Trend uncertainty'],
    ['MONTHS ANALYSED',trend?.samples ?? result?.dataset.finite_months ?? '—','Finite monthly values'],
    ['TREND DIRECTION',direction(trend),'Direction supported by the significance test'],
    ['MONTHLY COVERAGE',result ? `${number(result.dataset.finite_months / result.dataset.monthly_slots * 100)}%` : '—','Within the selected period'],
  ].map(([label,value,note]) => <div className="stat-card" key={label}><span>{label}</span><b>{value}</b><small>{note}</small></div>)}</div><div className="beginner-note">Statistical significance does not establish a cause. An unsupported trend does not prove an absence of change.</div></section>;
}
function PendingFeatures({ result }) {
  const spatial = result?.paradox;
  const years = result?.years_to_significance;
  return <div className="lab-feature-grid">
    <section className="feature-result-panel"><div className="panel-heading"><h2><Layers3 size={17} /> Paradox Finder</h2><span className="status-chip">{spatial ? 'GRID ANALYSED' : 'PREREQUISITE PENDING'}</span></div>
      {spatial ? <><p>{spatial.opposing_trends ? 'Supported increases and decreases meet the regional screening rule.' : 'The opposing-trend screening rule was not met.'}</p><Evidence label="TESTABLE CELLS" value={spatial.valid_cells} /><Evidence label="INCREASING SHARE" value={`${number(spatial.increasing_proportion * 100)}%`} /><Evidence label="DECREASING SHARE" value={`${number(spatial.decreasing_proportion * 100)}%`} /><p className="source-description">Shares count testable cells, not geographic area. Cell significance includes Benjamini-Yekutieli FDR correction.</p></> : <p>{result?.feature_status?.paradox?.reason || 'Run an analysis to check whether per-cell monthly histories are available.'}</p>}
    </section>
    <section className="feature-result-panel"><div className="panel-heading"><h2><Clock3 size={17} /> Years to significance</h2><span className="status-chip">{years?.estimate_years != null ? 'MODEL ESTIMATE' : 'MODEL PENDING'}</span></div><p>{years?.estimate_years != null ? `${number(years.estimate_years)} years under the stated model assumptions.` : result?.feature_status?.years_to_significance?.reason || 'A validated model of future effect and noise is required.'}</p>{years && <><p className="source-description">{years.method}</p><Warnings items={[...years.assumptions,...years.warnings]} /></>}</section>
  </div>;
}
function Summary({ result }) {
  return <section className="verdict-panel"><div className="verdict-heading"><ClipboardList size={22} /><div><Eyebrow>BACKEND EXPLANATION</Eyebrow><h2>Detective's verdict</h2></div><span className="status-chip">{result?.verdict?.ai_generated ? 'AI EXPLANATION' : 'COMPUTED SUMMARY'}</span></div><p className="computed-summary">{result?.verdict?.verdict || result?.summary || 'Run an analysis to see a summary based on the calculated statistics.'}</p>{result?.verdict && <p className="summary-method">{result.verdict.method}</p>}</section>;
}
function Provenance({ dataset }) {
  if (!dataset) return null;
  return <div className="source-details"><Evidence label="SOURCE" value={dataset.source} /><Evidence label="PRODUCT / VERSION" value={`${dataset.dataset_id || 'Not supplied'} / ${dataset.version || 'Not supplied'}`} /><Evidence label="DATA TYPE" value={kindLabel(dataset.data_kind)} /><Evidence label="MEASURED FIELD" value={dataset.source_variable} /><Evidence label="SOURCE FILE" value={dataset.source_file} /><Evidence label="PERIOD" value={dataset.temporal_coverage.map(month).join(' to ')} /><Evidence label="UNITS" value={dataset.units} />{dataset.unit_conversion && <><Evidence label="ORIGINAL SOURCE UNITS" value={dataset.source_units} /><p className="source-description">{dataset.unit_conversion.method}</p></>}<Evidence label="SCIENTIFIC REVIEW" value="Unreviewed" /><p className="source-description">{dataset.spatial_support}</p>{dataset.source_url && <a className="text-link" href={dataset.source_url} target="_blank" rel="noreferrer">SOURCE REQUEST ↗</a>}{dataset.documentation_url && <a className="text-link source-link" href={dataset.documentation_url} target="_blank" rel="noreferrer">PRODUCT DOCUMENTATION ↗</a>}<details><summary>Source fingerprint</summary><code className="source-hash">{dataset.source_sha256 ? `SHA256 ${dataset.source_sha256}` : `File revision ${dataset.source_revision || 'Not supplied'}`}</code></details></div>;
}

export function Lab() {
  const initial = useLocation().state;
  const [query,setQuery] = useSearchParams();
  const { datasets, places, topics } = useCatalog();
  const selectedId = query.get('dataset');
  const selected = datasets.find(d => d.id === selectedId);
  const place = query.get('location') || selected?.location_id || initial?.place || 'karachi';
  const topic = query.get('topic') || selected?.topic || initial?.topic || 'temperature';
  const dataset = selectedId ? selected : datasets.find(d => d.location_id === place && d.topic === topic);
  const [first,last] = bounds(dataset);
  const start = query.has('start') ? query.get('start') : initial?.start || first;
  const end = query.has('end') ? query.get('end') : initial?.end || last;
  const spatial = dataset && dataset.storage_format !== 'csv';
  const bbox = spatial ? query.has('bbox') ? query.get('bbox') : dataset.requested_bbox?.join(',') || '' : '';
  const changeSelection = (nextPlace,nextTopic) => {
    const next = datasets.find(d => d.location_id === nextPlace && d.topic === nextTopic);
    setQuery({ location:nextPlace, topic:nextTopic, ...(next ? { dataset:next.id, start:bounds(next)[0], end:bounds(next)[1] } : {}) });
  };
  const changeField = (name,value) => {
    const next = new URLSearchParams(query);
    if (dataset) next.set('dataset',dataset.id);
    next.set('start',start); next.set('end',end); next.set(name,value); setQuery(next);
  };
  const { result,error,loading,run } = useAnalysis(dataset,start,end,false,bbox);
  const activeDataset = result?.dataset || dataset;
  const label = dataset?.name || topics.find(v => v.id === topic)?.name;
  const invalid = selectionError(dataset,start,end);
  const reportQuery = dataset ? new URLSearchParams({ dataset:dataset.id,start,end,...(bbox ? { bbox } : {}) }).toString() : '';
  return <div className="page-wrap lab-page page-content">
    <div className="lab-header"><div><Eyebrow>EARTH SCIENCE / ANALYSIS WORKSPACE</Eyebrow><h1>Investigation Lab</h1><p>Explore source data and backend-computed statistics.</p></div><PageArtwork variant="lab" /></div><CatalogStatus />
    <div className="analysis-controls-panel"><div className="panel-title">INVESTIGATION PARAMETERS</div><div className="connected-controls">
      <label className="control-field"><span>LOCATION</span><div className="select-wrap"><select aria-label="Location" value={place} onChange={e => changeSelection(e.target.value,topic)}>{places.map(l => <option key={l.id} value={l.id}>{l.name}{datasets.some(d => d.location_id === l.id) ? '' : ' ? awaiting data'}</option>)}</select></div></label>
      <label className="control-field"><span>VARIABLE</span><div className="select-wrap"><select aria-label="Variable" value={topic} onChange={e => changeSelection(place,e.target.value)}>{topics.map(v => <option key={v.id} value={v.id}>{datasets.find(d => d.topic === v.id && d.location_id === place)?.name || v.name}</option>)}</select></div></label>
      <DateFields dataset={dataset} start={start} end={end} onStart={value => changeField('start',value)} onEnd={value => changeField('end',value)} />
      <button className="button button-primary" disabled={loading || !!invalid} onClick={run}><Play size={14} />{loading ? 'ANALYSING?' : 'RUN ANALYSIS'}</button>
    </div>{spatial && <label className="control-field bbox-field"><span>BOUNDING BOX ? WEST, SOUTH, EAST, NORTH</span><input aria-label="Bounding box" value={bbox} onChange={e => changeField('bbox',e.target.value)} /><small>Selection uses native cell centres. Maximum 100 cells and 600 monthly slots.</small></label>}<div className="controls-bottom"><span>{dataset ? `${dataset.monthly_slots} monthly slots available; units: ${dataset.units}` : 'Awaiting a source dataset for this selection.'}</span></div>{invalid && dataset && <div className="inline-error" role="alert">{invalid}</div>}</div>
    {error && <div className="inline-error" role="alert">{error}</div>}<div role="status" className="analysis-progress" aria-live="polite">{loading ? 'Calculating seasonal adjustment, trend and uncertainty...' : result ? 'Analysis complete; scientifically unreviewed' : ''}</div>
    <div className="lab-main-grid"><section className="panel"><div className="panel-heading"><h2>Investigation area</h2><span className="status-chip">{result?.paradox ? 'CELL TREND LAYER' : 'LOCATION REFERENCE'}</span></div><MapPanel activeLocation={place} dataset={activeDataset} paradox={result?.paradox} height="320px" /><p className="source-description">{activeDataset?.spatial_support || 'Location reference only. Source coverage has not been supplied.'}</p></section><section className="panel"><div className="panel-heading"><h2>Evidence and source</h2><span className="status-chip">{result ? 'ANALYSED' : 'NOT RUN'}</span></div>{activeDataset ? <Provenance dataset={activeDataset} /> : <StatusNotice>This selection is awaiting a registered dataset.</StatusNotice>}</section></div>
    <section className="panel chart-panel"><div className="panel-heading"><h2>{label} {dataset && <small>({dataset.units})</small>}</h2></div><TrendChart variableName={label} unit={dataset?.units} analysis={result} /></section>
    <Statistics result={result} /><PendingFeatures result={result} /><Summary result={result} />
    {activeDataset && <section className="panel"><h2>Interpretation and limitations</h2><Warnings items={result?.warnings || dataset.limitations} />{result?.trend && <details><summary>Calculation methods</summary>{Object.entries(result.trend.methods).map(([key,value]) => <Evidence key={key} label={key.toUpperCase()} value={value} />)}</details>}</section>}
    <div className="lab-bottom-actions">{result && <Link className="button button-primary" to={`/cases/${place}?${reportQuery}`}>OPEN CASE REPORT<ArrowRight size={16} /></Link>}<Link className="button button-secondary" to="/compare">COMPARE CITIES</Link></div>
  </div>;
}

export function CaseFiles() {
  const { datasets, places, preparedCases, casesError, reload } = useCatalog();
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>ARCHIVE / INVESTIGATION REPORTS</Eyebrow><h1>Case files.</h1><p>Reports use current source data and retain scientific limitations.</p></div><Link className="button button-primary" to="/wizard">NEW INVESTIGATION<ArrowRight size={15} /></Link></div><CatalogStatus />
    <div className="case-list">{places.map((place,i) => {
      const available = datasets.filter(d => d.location_id === place.id);
      return <article className="case-row" key={place.id}><div className="case-row-main"><div className="case-card-meta"><span>CASE {String(i + 1).padStart(3,'0')}</span><span className="status-chip">{available.length ? 'SOURCE DATA AVAILABLE' : 'AWAITING DATA'}</span></div><h2>{place.name} investigation</h2><p>{available.length ? `${available.length} monthly datasets; scientifically unreviewed` : 'Dataset collection remains planned.'}</p></div><Link className="case-open" to={`/cases/${place.id}`}>OPEN FILE<ArrowRight size={15} /></Link></article>;
    })}</div>
    <h2 className="archive-heading">Prepared regional cases</h2>
    {casesError && <div className="inline-error" role="alert">{casesError}<button className="button button-secondary" onClick={reload}>RETRY</button></div>}
    <div className="case-list">{preparedCases.map(prepared => <article className="case-row" key={prepared.id}><div className="case-row-main"><span className="status-chip">{prepared.available ? prepared.validated ? 'REVIEW RECORDED' : 'UNREVIEWED PRECOMPUTE' : 'AWAITING DATA'}</span><h2>{prepared.title}</h2><p>{prepared.message}</p></div><Link className="case-open" to={`/cases/demo/${prepared.id}`}>OPEN PREPARED CASE<ArrowRight size={15} /></Link></article>)}</div><Link className="button button-secondary" to="/compare">KARACHI VS LAHORE<ArrowRight size={15} /></Link>
  </div>;
}
export function CaseFileDetails() {
  const { caseId } = useParams();
  const [query,setQuery] = useSearchParams();
  const { datasets, places } = useCatalog();
  const options = datasets.filter(d => d.location_id === caseId);
  const dataset = query.get('dataset') ? options.find(d => d.id === query.get('dataset')) : options.find(d => d.topic === 'temperature') || options[0];
  const [first,last] = bounds(dataset);
  const start = query.get('start') || first;
  const end = query.get('end') || last;
  const bbox = dataset?.storage_format !== 'csv' ? query.get('bbox') || dataset?.requested_bbox?.join(',') || '' : '';
  const { result,error,loading,run } = useAnalysis(dataset,start,end,true,bbox);
  const location = places.find(l => l.id === caseId);
  if (!location) return <div className="page-wrap page-content"><h1>Unknown case</h1><Link to="/cases">Return to case files</Link></div>;
  return <div className="page-wrap page-content case-detail"><div className="case-detail-toolbar"><Link className="back-link" to="/cases"><ChevronLeft size={15} />ALL CASE FILES</Link><button className="button button-secondary" disabled={!result} onClick={() => window.print()}><Download size={15} />PRINT / SAVE AS PDF</button></div><div className="case-report-header"><div><Eyebrow>ENVIRONMENTAL INVESTIGATION REPORT</Eyebrow><h1>{location.name} case file</h1><p>{dataset?.name || 'Awaiting dataset'}</p></div><span className="status-chip">SCIENTIFICALLY UNREVIEWED</span></div><CatalogStatus />
    {dataset && <div className="report-selector"><label className="control-field"><span>DATASET</span><div className="select-wrap"><select aria-label="Report dataset" value={dataset.id} onChange={e => setQuery({ dataset:e.target.value })}>{options.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></label><span>{start} to {end}</span></div>}
    {loading && <StatusNotice>Calculating this report from the source export…</StatusNotice>}{error && <div role="alert" className="inline-error">{error}<button className="button button-secondary" onClick={run}>RETRY</button></div>}
    {!dataset && <StatusNotice>{query.get('dataset') ? 'The requested dataset is not registered for this location.' : 'This case remains planned. Its dataset has not been supplied.'}</StatusNotice>}
    {result && <><section className="panel"><h2>Question and study period</h2><p className="source-description">How did {dataset.name.toLowerCase()} change in the supplied {location.name} export between {start} and {end}?</p><Provenance dataset={result.dataset} /></section><section className="panel chart-panel"><h2>Monthly source values and fitted trend</h2><TrendChart variableName={dataset.name} unit={dataset.units} analysis={result} /></section><section className="panel"><h2>Geographic context</h2><MapPanel activeLocation={caseId} dataset={result.dataset} paradox={result.paradox} height="260px" /></section><Statistics result={result} /><Summary result={result} /><PendingFeatures result={result} /><section className="panel"><h2>Limitations and source review</h2><Warnings items={result.warnings} />{result.trend && <details><summary>Calculation methods</summary>{Object.entries(result.trend.methods).map(([key,value]) => <Evidence key={key} label={key} value={value} />)}</details>}</section></>}
  </div>;
}
export function Compare() {
  const { topics, places } = useCatalog();
  const [topic,setTopic] = useState('temperature');
  const [leftLocation,setLeftLocation] = useState('karachi');
  const [rightLocation,setRightLocation] = useState('lahore');
  const [comparison,setComparison] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [start,setStart] = useState('');
  const [end,setEnd] = useState('');
  const [retry,setRetry] = useState(0);
  const active = useRef({ sequence:0, controller:null });
  useEffect(() => {
    active.current.controller?.abort();
    const controller = new AbortController(); active.current.controller = controller;
    const sequence = ++active.current.sequence;
    setComparison(null); setError(''); setLoading(true);
    api.compare({ topic,left_location:leftLocation,right_location:rightLocation },controller.signal).then(({ data }) => {
      if (sequence === active.current.sequence) { setComparison(data); setStart(month(data.start)); setEnd(month(data.end)); }
    }).catch(e => { if (!controller.signal.aborted && sequence === active.current.sequence) setError(errorMessage(e)); }).finally(() => { if (sequence === active.current.sequence) setLoading(false); });
    return () => { controller.abort(); active.current.sequence++; };
  }, [topic,leftLocation,rightLocation,retry]);
  const run = async () => {
    active.current.controller?.abort();
    const controller = new AbortController(); active.current.controller = controller;
    const sequence = ++active.current.sequence;
    setError(''); setLoading(true);
    try {
      const { data } = await api.compare({ topic,left_location:leftLocation,right_location:rightLocation,run:true,...dateParams(start,end) },controller.signal);
      if (sequence === active.current.sequence) setComparison(data);
    } catch (e) { if (!controller.signal.aborted && sequence === active.current.sequence) setError(errorMessage(e)); }
    finally { if (sequence === active.current.sequence) setLoading(false); }
  };
  const shared = comparison?.available ? { ...comparison.left_dataset, temporal_coverage:[comparison.start,comparison.end] } : null;
  const invalid = selectionError(shared,start,end);
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>COMPARATIVE INVESTIGATION</Eyebrow><h1>City vs city.</h1><p>The backend checks product, version, units and shared coverage before comparison.</p></div><PageArtwork variant="compare" /></div><CatalogStatus />
    <label className="control-field"><span>VARIABLE</span><div className="select-wrap"><select aria-label="Comparison variable" value={topic} onChange={e => setTopic(e.target.value)}>{topics.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div></label>
    <div className="date-fields">
      <label className="control-field"><span>LEFT LOCATION</span><div className="select-wrap"><select aria-label="Left comparison location" value={leftLocation} onChange={e => setLeftLocation(e.target.value)}>{places.map(place => <option key={place.id} value={place.id} disabled={place.id === rightLocation}>{place.name}</option>)}</select></div></label>
      <label className="control-field"><span>RIGHT LOCATION</span><div className="select-wrap"><select aria-label="Right comparison location" value={rightLocation} onChange={e => setRightLocation(e.target.value)}>{places.map(place => <option key={place.id} value={place.id} disabled={place.id === leftLocation}>{place.name}</option>)}</select></div></label>
    </div>
    {loading && <StatusNotice>Checking comparable sources and calculating requested results?</StatusNotice>}
    {error && <div className="inline-error" role="alert">{error}<button className="button button-secondary" onClick={() => setRetry(r => r + 1)}>RETRY</button></div>}
    {comparison && !comparison.available && <StatusNotice>{comparison.reason}</StatusNotice>}
    {shared && <div className="period-actions"><DateFields dataset={shared} start={start} end={end} onStart={value => { setStart(value); setComparison(c => ({...c,left:null,right:null})); }} onEnd={value => { setEnd(value); setComparison(c => ({...c,left:null,right:null})); }} /><button className="button button-primary" disabled={loading || !!invalid} onClick={run}>RUN COMPARISON</button>{invalid && <div role="alert">{invalid}</div>}</div>}
    <div className="compare-grid">{[{location:leftLocation,dataset:comparison?.left_dataset,result:comparison?.left},{location:rightLocation,dataset:comparison?.right_dataset,result:comparison?.right}].map(item => <section className="panel compare-city" key={item.location}><h2>{places.find(place => place.id === item.location)?.name || item.location}</h2><p className="source-description">{item.dataset ? `${item.dataset.name} · ${item.dataset.units}` : 'Awaiting dataset'}</p><TrendChart variableName={item.dataset?.name} unit={item.dataset?.units} analysis={item.result} />{item.result && <><p className="source-description">{item.result.summary}</p><Provenance dataset={item.result.dataset} /><Warnings items={item.result.warnings} /></>}</section>)}</div>
  </div>;
}

export function PreparedCase() {
  const { caseId } = useParams();
  const [result,setResult] = useState(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [retry,setRetry] = useState(0);
  useEffect(() => {
    let active = true; setResult(null); setError(''); setLoading(true);
    api.getDemoCase(caseId).then(({data}) => { if (active) setResult(data); }).catch(e => { if(active) setError(errorMessage(e)); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [caseId,retry]);
  const trend = result?.trend?.result || result?.result?.result;
  const series = result?.timeseries?.series || trend?.raw || [];
  const paradox = result?.paradox || (result?.result?.cells ? result.result : null);
  const variable = result?.timeseries?.variable || result?.trend?.variable || result?.result?.variable;
  const analysis = { series,trend,paradox,summary:result?.message,warnings:[],feature_status:{} };
  return <div className="page-wrap page-content case-detail"><div className="case-detail-toolbar"><Link className="back-link" to="/cases"><ChevronLeft size={15} />ALL CASE FILES</Link><button className="button button-secondary" disabled={!result?.available} onClick={() => window.print()}><Download size={15} />PRINT / SAVE AS PDF</button></div><h1>{caseId?.toUpperCase()} prepared case</h1>
    {loading && <StatusNotice>Reading the prepared artifact?</StatusNotice>}{error && <div className="inline-error" role="alert">{error}<button className="button button-secondary" onClick={() => setRetry(r => r + 1)}>RETRY</button></div>}
    {result && <><StatusNotice>{result.message}</StatusNotice>{result.available && <><section className="panel"><Evidence label="SOURCE" value={result.source} /><Evidence label="PROVENANCE" value={result.provenance} /><Evidence label="DATA KIND" value={kindLabel(variable?.data_kind)} /><Evidence label="REVIEW" value={result.validated ? `Review recorded: ${result.validated_by}` : 'Scientifically unreviewed'} />{variable?.limitations && <Warnings items={variable.limitations} />}</section>{series.length > 0 && <section className="panel chart-panel"><h2>{variable?.name} ({variable?.units})</h2><TrendChart variableName={variable?.name} unit={variable?.units} analysis={analysis} /></section>}{trend && <Statistics result={{...analysis,dataset:{finite_months:trend.samples,monthly_slots:trend.raw.length}}} />}<PendingFeatures result={analysis} />{paradox && <section className="panel"><h2>Prepared cell trends</h2><MapPanel dataset={{ requested_bbox:paradox.bbox,spatial_support:variable?.spatial_support }} paradox={paradox} height="320px" /><Warnings items={paradox.warnings} /></section>}</>}</>}
  </div>;
}
