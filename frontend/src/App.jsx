import { useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardList, Clock3, CloudSun, Database, Download, Droplets, FileText, FlaskConical, Gauge,
  Layers3, MapPin, Menu, Microscope, Play, RotateCcw, Search, ShieldAlert, Sprout, Sun, Thermometer,
  TrendingUp, Wind, Waves, X,
} from "lucide-react";
import { demoCases, demoNotice, locations, variables } from "./data";
import { Layout, Eyebrow, SectionHeading, StatusNotice } from "./components/Layout";
import { MapPanel } from "./components/MapPanel";
import { TrendChart } from "./components/TrendChart";
import { EarthArtwork, LocationArtwork, PageArtwork, TopicArtwork } from "./components/Artwork";
import { api } from "./api/client";

const topicInfo = {
  WATER: { icon: Droplets, description: "Follow the movement and availability of water." },
  PLANTS: { icon: Sprout, description: "Observe how vegetation changes over time." },
  AIR: { icon: Wind, description: "Explore particles and atmospheric conditions." },
  HEAT: { icon: Thermometer, description: "Investigate temperature patterns." },
};

function Home() {
  return (
    <div>
      <section className="hero page-wrap">
        <div className="hero-copy">
          <Eyebrow>EARTH INTELLIGENCE / INVESTIGATION SYSTEM</Eyebrow>
          <h1>Earth is changing.<br /><span>Are you seeing</span><br />the whole story?</h1>
          <p>Investigate environmental trends, uncover local differences, and discover whether the evidence is statistically significant.</p>
          <div className="hero-actions"><Link to="/wizard" className="button button-primary">OPEN AN INVESTIGATION <ArrowRight size={16} /></Link><Link to="/cases" className="button button-secondary">EXPLORE DEMO CASES</Link></div>
          <div className="hero-proof"><span><b>02</b> INITIAL LOCATIONS</span><i /><span><b>NASA</b> EARTH SCIENCE</span><i /><span><b>01</b> MISSION: FIND THE TREND</span></div>
        </div>
        <div className="hero-visual" aria-label="Illustrative Earth observation visualization">
          <EarthArtwork />
          <div className="visual-tag tag-top"><span className="signal" /> ORBITAL VIEW <b>01</b></div>
          <div className="visual-tag tag-bottom"><span>DATA FEED</span><b>AWAITING SOURCE</b></div>
          <div className="visual-coordinates">24°51' N<br />67°00' E</div>
          <div className="visual-note">ILLUSTRATIVE VECTOR · NOT LIVE NASA DATA</div>
        </div>
      </section>
      <section className="page-wrap home-section">
        <SectionHeading label="START WITH A PLACE" title="Two cities. Two investigations." description="Choose a case to explore the platform. Scientific results will appear when verified data is connected." action={<Link to="/cases" className="text-link">ALL CASE FILES <ArrowRight size={15} /></Link>} />
        <div className="city-grid">{locations.map((location, index) => <CityCard key={location.id} location={location} index={index} />)}</div>
      </section>
      <section className="process-band">
        <div className="page-wrap">
          <SectionHeading label="THE METHOD" title="Every finding follows the evidence." description="A transparent path from satellite observations to an understandable investigation." />
          <div className="process-flow">{["NASA DATA", "DATA CLEANING", "STATISTICAL ANALYSIS", "INVESTIGATION VERDICT"].map((item, index) => <div key={item} className="process-step"><span>0{index + 1}</span><b>{item}</b>{index < 3 && <ArrowRight size={16} />}</div>)}</div>
        </div>
      </section>
      <section className="page-wrap home-section feature-section">
        <SectionHeading label="TOOLS FOR THE CURIOUS" title="Look beyond the line." description="Tools built to make careful environmental investigation easier to understand." />
        <div className="feature-grid">
          <FeatureCard icon={Layers3} number="01" title="Paradox Finder" text="See whether significant rising and falling trends coexist across one region." />
          <FeatureCard icon={Clock3} number="02" title="Years-to-Significance" text="Explore a cautious estimate of how much additional evidence might be needed." />
          <FeatureCard icon={ClipboardList} number="03" title="Case File Verdict" text="Read a short, plain-language summary grounded in computed statistics." />
          <FeatureCard icon={Search} number="04" title="Detective Wizard" text="Build a focused investigation by choosing a topic, place and time period." />
        </div>
      </section>
      <section className="home-cta"><div className="page-wrap"><div><Eyebrow>YOUR NEXT DISCOVERY STARTS HERE</Eyebrow><h2>Follow the evidence.<br /><span>Ask better questions.</span></h2></div><Link to="/wizard" className="button button-primary">START AN INVESTIGATION <ArrowRight size={16} /></Link></div></section>
    </div>
  );
}

function CityCard({ location, index }) {
  return (
    <article className={`city-card city-${index}`}>
      <div className="city-art"><LocationArtwork locationId={location.id} className="city-location-art" /><span className="city-coord">{location.lat.toFixed(2)}° N / {location.lng.toFixed(2)}° E</span></div>
      <div className="city-card-content">
        <div className="city-card-kicker"><span>{location.code}</span><span className="available"><i /> AVAILABLE</span></div>
        <h3>{location.name}</h3><p>{location.kind} · {location.province}, Pakistan</p>
        <div className="city-card-bottom"><span>DEMO CASE TEMPLATE</span><Link to="/wizard" state={{ locationId: location.id }} aria-label={`Investigate ${location.name}`} className="round-arrow"><ArrowRight size={17} /></Link></div>
      </div>
    </article>
  );
}

function FeatureCard({ icon: Icon, number, title, text }) {
  return <article className="feature-card"><div className="feature-top"><span>{number}</span><Icon size={18} /></div><h3>{title}</h3><p>{text}</p><span className="feature-line" /></article>;
}

const steps = ["TOPIC", "LOCATION", "TIME PERIOD", "REVIEW"];
function Wizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState("");
  const [place, setPlace] = useState(location.state?.locationId || "");
  const [period, setPeriod] = useState("");
  const [message, setMessage] = useState("");
  const selectedVariable = variables.find((item) => item.id === topic);
  const selectedLocation = locations.find((item) => item.id === place);
  const continueStep = () => {
    if ((step === 0 && !topic) || (step === 1 && !place)) {
      setMessage("Choose an option to continue.");
      return;
    }
    if (step === 2 && !period) {
      setMessage("No verified data coverage is available. You can review this setup, but an analysis cannot run until coverage is confirmed.");
    } else {
      setMessage("");
    }
    setStep(Math.min(step + 1, 3));
  };
  const begin = () => navigate("/lab", { state: { topic, place, period } });
  return <div className="page-wrap page-content">
    <div className="page-title-row"><div><Eyebrow>INVESTIGATION SETUP / NEW CASE</Eyebrow><h1>Build your investigation.</h1><p>Choose the question you want the evidence to answer.</p></div><PageArtwork variant="wizard" /><span className="case-label"><FlaskConical size={15} /> NEW INVESTIGATION</span></div>
    <div className="wizard-progress">{steps.map((label, index) => <div key={label} className={`wizard-step ${step === index ? "active" : ""} ${step > index ? "complete" : ""}`}><span>{step > index ? <Check size={14} /> : `0${index + 1}`}</span><b>{label}</b>{index < steps.length - 1 && <i />}</div>)}</div>
    <div className="wizard-layout"><div className="wizard-main">
      {step === 0 && <><div className="wizard-heading"><span className="step-count">STEP 01 / 04</span><h2>What do you want to investigate?</h2><p>Select an environmental topic, then choose a variable.</p></div>
        {Object.keys(topicInfo).map((group) => { const GroupIcon = topicInfo[group].icon; return <div className="topic-group" key={group}><div className="topic-label"><GroupIcon size={16} /><b>{group}</b><span>{topicInfo[group].description}</span></div><div className="variable-grid">{variables.filter((item) => item.group === group).map((item) => <button key={item.id} className={`variable-option ${topic === item.id ? "selected" : ""}`} onClick={() => { setTopic(item.id); setMessage(""); }}><TopicArtwork variable={item.id} /><b>{item.name}</b><span>{item.description}</span>{topic === item.id && <Check size={15} className="selection-check" />}</button>)}</div></div>; })}
      </>}
      {step === 1 && <><div className="wizard-heading"><span className="step-count">STEP 02 / 04</span><h2>Choose your investigation area.</h2><p>Start with one of the two available Pakistan case locations.</p></div><div className="location-options">{locations.map((item, index) => <button key={item.id} className={`location-option ${place === item.id ? "selected" : ""}`} onClick={() => { setPlace(item.id); setMessage(""); }}><div className={`location-mini-map map-${index}`}><LocationArtwork locationId={item.id} className="wizard-location-art" /></div><span className="case-code">{item.code}</span><b>{item.name}</b><small>{item.province}, Pakistan · {item.kind}</small>{place === item.id && <Check size={16} className="selection-check" />}</button>)}</div><div className="wizard-map"><MapPanel activeLocation={place || "karachi"} height="250px" compact /></div><StatusNotice>Map is a location reference. Custom boundary drawing and verified regional boundaries are not yet connected.</StatusNotice></>}
      {step === 2 && <><div className="wizard-heading"><span className="step-count">STEP 03 / 04</span><h2>Choose the time period.</h2><p>Coverage must be verified for the selected variable and location before a period can be selected.</p></div><StatusNotice>No verified dataset coverage is available in this frontend demo. Periods remain unavailable until the data service confirms coverage.</StatusNotice><div className="period-grid">{[10, 20, 30].map((years) => <button key={years} className="period-option disabled" disabled title="Data coverage not verified"><span>{years} YEARS</span><b>Unavailable</b><small>Coverage unverified</small><span className="lock-label">LOCKED</span></button>)}</div><div className="callout-note"><CircleHelp size={17} /><span>This prevents the app from implying that any particular NASA dataset covers a selected region or period.</span></div></>}
      {step === 3 && <><div className="wizard-heading"><span className="step-count">STEP 04 / 04</span><h2>Review your case.</h2><p>Confirm the configuration before opening the investigation lab.</p></div><div className="review-table"><ReviewRow label="VARIABLE" value={selectedVariable?.name || "Not selected"} /><ReviewRow label="LOCATION" value={selectedLocation ? `${selectedLocation.name}, ${selectedLocation.province}` : "Not selected"} /><ReviewRow label="TIME PERIOD" value={period ? `${period} years` : "Not available — data coverage unverified"} /><ReviewRow label="UNIT" value={selectedVariable?.unit || "Pending variable"} /><ReviewRow label="DATASET" value="NASA Earth science · source not connected" /></div><StatusNotice>This configuration does not contain data or scientific results. The lab will show analysis as unavailable.</StatusNotice></>}
      {message && <div className="inline-error" role="alert"><ShieldAlert size={16} />{message}</div>}
      <div className="wizard-footer">{step > 0 ? <button className="button button-secondary" onClick={() => { setStep(step - 1); setMessage(""); }}><ChevronLeft size={16} /> BACK</button> : <span className="muted-small">Your setup stays in this browser session.</span>}{step < 3 ? <button className="button button-primary" onClick={continueStep}>CONTINUE <ChevronRight size={16} /></button> : <button className="button button-primary" onClick={begin}>BEGIN INVESTIGATION <ArrowRight size={16} /></button>}</div>
    </div>
    <aside className="wizard-side"><Eyebrow>CASE PREVIEW</Eyebrow><div className="side-preview-icon"><Microscope size={22} /></div><h3>{selectedVariable?.name || "Select a variable"}</h3><p>{selectedLocation ? `${selectedLocation.name}, ${selectedLocation.province}` : "Choose an investigation area"}</p><div className="side-divider" /><div className="side-info"><span>TIME COVERAGE</span><b>Awaiting verification</b></div><div className="side-info"><span>ANALYSIS STATUS</span><b className="status-pending">NOT STARTED</b></div><div className="side-info"><span>MODE</span><b>DEMO · NO RESULTS</b></div></aside></div>
  </div>;
}

function AnalysisControls({ activeLocation, setActiveLocation, activeVariable, setActiveVariable, onRun, loading }) {
  return <div className="controls-grid">
    <label className="control-field"><span>LOCATION</span><div className="select-wrap"><MapPin size={15} /><select value={activeLocation} onChange={(event) => setActiveLocation(event.target.value)}>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}, Pakistan</option>)}</select><ChevronDown size={14} /></div></label>
    <label className="control-field"><span>VARIABLE</span><div className="select-wrap"><ActivityIcon /><select value={activeVariable} onChange={(event) => setActiveVariable(event.target.value)}>{variables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div></label>
    <label className="control-field"><span>DATE RANGE</span><div className="select-wrap"><Clock3 size={15} /><select defaultValue="unavailable" disabled><option value="unavailable">Unavailable · verify coverage</option></select><ChevronDown size={14} /></div></label>
    <button className="button button-primary run-button" onClick={onRun} disabled={loading}>{loading ? "CHECKING..." : <><Play size={14} fill="currentColor" /> RUN ANALYSIS</>}</button>
  </div>;
}
function ActivityIcon() { return <TrendingUp size={15} />; }

function Lab() {
  const routerLocation = useLocation();
  const [activeLocation, setActiveLocation] = useState(routerLocation.state?.place || "karachi");
  const [activeVariable, setActiveVariable] = useState(routerLocation.state?.topic || variables[0].id);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = locations.find((item) => item.id === activeLocation) || locations[0];
  const variable = variables.find((item) => item.id === activeVariable) || variables[0];
  const runAnalysis = async () => {
    setLoading(true); setNotice("");
    try {
      await api.getTimeseries({ location: activeLocation, variable: activeVariable });
      setNotice("The data service responded, but this demo does not interpret or display unverified results.");
    } catch {
      setNotice("Analysis unavailable: no backend data service is connected. No results have been calculated.");
    } finally { setLoading(false); }
  };
  const reset = () => { setActiveLocation("karachi"); setActiveVariable(variables[0].id); setNotice(""); };
  return <div className="page-wrap lab-page page-content">
    <div className="lab-header"><div><Eyebrow>EARTH OBSERVATION / ANALYSIS WORKSPACE</Eyebrow><h1>Investigation Lab</h1><p>Examine the evidence, question the signal, understand the limits.</p></div><PageArtwork variant="lab" /><div className="lab-case-stamp"><span>CASE #</span><b>{selected.id === "karachi" ? "001" : "002"}</b><i>OPEN / DEMO</i></div></div>
    <div className="lab-location-line"><span><MapPin size={15} /> LOCATION: <b>{selected.name.toUpperCase()}, PAKISTAN</b></span><span>ANALYSIS STATUS <b className="status-pending">AWAITING DATA</b></span></div>
    <div className="analysis-controls-panel"><div className="panel-title"><span>01</span> INVESTIGATION PARAMETERS</div><AnalysisControls {...{ activeLocation, setActiveLocation, activeVariable, setActiveVariable, onRun: runAnalysis, loading }} /><div className="controls-bottom"><span><CircleHelp size={14} /> Date ranges unlock when data coverage is verified.</span><button onClick={reset}><RotateCcw size={13} /> RESET</button></div>{notice && <div className="inline-notice" role="status">{notice}</div>}</div>
    <div className="lab-main-grid"><section className="panel map-panel"><div className="panel-heading"><div><span className="panel-index">02 / GEOGRAPHY</span><h2>Investigation area</h2></div><span className="panel-tag"><MapPin size={13} /> REFERENCE MAP</span></div><MapPanel activeLocation={activeLocation} height="365px" /><div className="map-legend"><span><i className="legend-point" /> Selected location</span><span><i className="legend-outline" /> Reference only · no trend layer</span></div></section>
      <section className="panel analysis-state-panel"><div className="panel-heading"><div><span className="panel-index">03 / EVIDENCE STATUS</span><h2>Signal assessment</h2></div><span className="status-chip">NOT RUN</span></div><div className="evidence-empty"><div className="empty-graphic"><div><Database size={25} /></div><span /><span /></div><h3>Evidence has not been loaded.</h3><p>Connect an analysis service with verified observations to calculate any trend statistics.</p></div><div className="evidence-rows"><EvidenceRow label="DATA SOURCE" value="Not connected" /><EvidenceRow label="COVERAGE" value="Unverified" /><EvidenceRow label="SCIENTIFIC RESULTS" value="None available" /></div><div className="integrity-note"><ShieldAlert size={16} /><span>No statistics, trend direction or significance are being fabricated.</span></div></section></div>
    <section className="panel chart-panel"><div className="panel-heading"><div><span className="panel-index">04 / TIME SERIES</span><h2>{variable.name} <small>({variable.unit})</small></h2></div><span className="panel-tag">RAW · SEASONAL-ADJUSTED · TREND</span></div><TrendChart variableName={variable.name} unit={variable.unit} /></section>
    <section className="panel stats-panel"><div className="panel-heading"><div><span className="panel-index">05 / STATISTICAL FINDINGS</span><h2>What does the evidence say?</h2></div><span className="status-chip">INSUFFICIENT DATA</span></div><div className="stats-grid">{[
      ["RATE OF CHANGE", "—", "Theil-Sen slope", "No analysis available"],
      ["P-VALUE", "—", "Statistical evidence", "No analysis available"],
      ["95% CONFIDENCE INTERVAL", "—", "Range of plausible slopes", "No analysis available"],
      ["YEARS ANALYSED", "—", "Verified data coverage", "No analysis available"],
      ["TREND DIRECTION", "—", "Rising, falling or unclear", "No analysis available"],
      ["SIGNIFICANCE", "—", "Mann-Kendall test", "Insufficient data"],
    ].map((item) => <div className="stat-card" key={item[0]}><span>{item[0]} <Help title={item[2]} /></span><b>{item[1]}</b><small>{item[3]}</small></div>)}</div><div className="beginner-note"><CircleHelp size={15} /> Statistical significance can support evidence of a trend; it does not prove what caused it.</div></section>
    <div className="lab-feature-grid"><ParadoxCard /><YearsCard /></div>
    <section className="verdict-panel"><div className="verdict-heading"><span className="verdict-icon"><ClipboardList size={20} /></span><div><Eyebrow>CASE FILE SUMMARY / AI EXPLANATION</Eyebrow><h2>Detective’s verdict</h2></div><span className="status-chip">AWAITING STATISTICS</span></div><div className="verdict-empty"><span>“</span><p>A verdict will appear only after verified backend statistics are available. This panel never invents scientific findings.</p></div><div className="verdict-foot"><ShieldAlert size={14} /> AI explanations can be wrong. Check the numbers.</div></section>
    <div className="lab-bottom-actions"><Link to="/cases" className="button button-secondary"><FileText size={15} /> OPEN CASE FILES</Link><Link to="/compare" className="button button-secondary">COMPARE CITIES <ArrowRight size={15} /></Link></div>
  </div>;
}

function EvidenceRow({ label, value }) { return <div className="evidence-row"><span>{label}</span><b>{value}</b></div>; }
function ReviewRow({ label, value }) { return <div className="review-row"><span>{label}</span><b>{value}</b></div>; }
function Help({ title }) { return <span className="help-tip" tabIndex="0" aria-label={title} data-tip={title}><CircleHelp size={13} /></span>; }

function ParadoxCard() {
  return <section className="feature-result-panel paradox-panel"><div className="panel-heading"><div><span className="panel-index">SIGNATURE FEATURE / 01</span><h2><Layers3 size={17} /> Paradox Finder</h2></div><span className="status-chip">NO DATA</span></div><p>Discover whether different parts of the same region show opposite environmental trends.</p><div className="paradox-visual"><div className="grid-schematic" aria-label="Schematic grid; no measured values"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="paradox-no-data"><Database size={19} /><b>Regional grid unavailable</b><small>No geospatial trend data loaded</small></div></div><div className="paradox-stats"><span>RISING CELLS <b>—</b></span><span>FALLING CELLS <b>—</b></span><span>UNCLEAR <b>—</b></span></div><div className="result-explanation"><ShieldAlert size={14} /> Paradox status is undetermined until regional data is analyzed.</div></section>;
}

function YearsCard() {
  return <section className="feature-result-panel years-panel"><div className="panel-heading"><div><span className="panel-index">SIGNATURE FEATURE / 02</span><h2><Clock3 size={17} /> Years to significance</h2></div><span className="status-chip">NO ESTIMATE</span></div><p>Estimate how much additional data might be needed if the trend and noise continue.</p><div className="years-display"><div className="years-number">—<small>YEARS</small></div><div className="years-timeline"><div><i /><i /><i /><i /><i /></div><span>NOW</span><span>ESTIMATE UNAVAILABLE</span></div></div><div className="estimate-warning"><CircleHelp size={15} /><span>This is an estimate, not a promise. No estimate can be made without computed statistics.</span></div></section>;
}

function CaseFiles() {
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>ARCHIVE / INVESTIGATION RECORDS</Eyebrow><h1>Case files.</h1><p>Evidence-led reports, ready to explore when data is available.</p></div><PageArtwork variant="cases" /><Link to="/wizard" className="button button-primary">NEW INVESTIGATION <ArrowRight size={15} /></Link></div><div className="archive-note"><BookOpen size={17} /><span>These are demo templates, not completed scientific findings. Each report will distinguish data source, analysis and limitations.</span></div><div className="case-list">{demoCases.map((item) => <article className="case-row" key={item.id}><div className="case-row-map"><LocationArtwork locationId={item.id === "lahore" ? "lahore" : "karachi"} className="case-location-art" /></div><div className="case-row-main"><div className="case-card-meta"><span>CASE FILE #{item.number}</span><span className="status-chip">{item.status}</span></div><h2>{item.title}</h2><p>{item.description}</p><div className="case-row-details"><span><MapPin size={13} />{item.location}</span><span><TrendingUp size={13} />{item.variable}</span></div></div><Link to={`/cases/${item.id}`} className="case-open">OPEN FILE <ArrowRight size={15} /></Link></article>)}</div></div>;
}

function CaseFileDetails() {
  const { caseId } = useParams();
  const item = demoCases.find((entry) => entry.id === caseId) || demoCases[0];
  const loc = locations.find((entry) => entry.id === caseId) || locations[0];
  return <div className="page-wrap page-content case-detail"><div className="case-detail-toolbar"><Link to="/cases" className="back-link"><ChevronLeft size={15} /> ALL CASE FILES</Link><button className="button button-secondary" onClick={() => window.print()}><Download size={15} /> DOWNLOAD / PRINT</button></div><div className="case-report-header"><div><Eyebrow>SCIENTIFIC INVESTIGATION REPORT / CASE #{item.number}</Eyebrow><h1>{item.title}</h1><p>{item.location}</p></div><PageArtwork variant="report" /><span className="status-chip">DEMO TEMPLATE</span></div><div className="report-disclaimer"><ShieldAlert size={16} /> {demoNotice}</div><div className="report-grid"><ReportBlock label="INVESTIGATION" title="Question & setup"><EvidenceRow label="VARIABLE" value="Not selected" /><EvidenceRow label="DATASET SOURCE" value="Not connected" /><EvidenceRow label="DATE COVERAGE" value="Not verified" /></ReportBlock><ReportBlock label="GEOGRAPHY" title="Study area"><MapPanel activeLocation={loc.id} height="240px" compact /></ReportBlock><ReportBlock label="TIME SERIES" title="Observations"><TrendChart variableName="Selected variable" unit="unit" /></ReportBlock><ReportBlock label="STATISTICS" title="Computed findings"><div className="report-empty">No backend-computed statistics are available for this template.</div></ReportBlock><ReportBlock label="PARADOX FINDER" title="Regional variation"><div className="report-empty">Regional geospatial trend data has not been loaded.</div></ReportBlock><ReportBlock label="YEARS-TO-SIGNIFICANCE" title="Additional evidence"><div className="report-empty">Estimate unavailable without computed statistics.</div></ReportBlock><ReportBlock label="DETECTIVE’S VERDICT" title="Plain-language summary"><div className="report-empty">A three-sentence AI summary will be shown only when based on backend-computed statistics.</div></ReportBlock><ReportBlock label="LIMITATIONS" title="Interpret with care"><ul className="limitations-list"><li>Data source and coverage have not been verified.</li><li>No trend, significance or cause has been established.</li><li>Statistical significance does not prove causation.</li></ul></ReportBlock></div><div className="report-next"><b>NEXT STEPS</b><p>Connect a verified dataset, confirm regional coverage, then run the statistical analysis before sharing findings.</p><Link to="/wizard" className="text-link">CREATE AN INVESTIGATION <ArrowRight size={15} /></Link></div></div>;
}

function ReportBlock({ label, title, children }) { return <section className="report-block"><div><span className="panel-index">{label}</span><h2>{title}</h2></div>{children}</section>; }

const concepts = [
  ["Variable", "A measurable feature you want to investigate, such as precipitation or air temperature."],
  ["Time series", "A set of observations recorded in time order. Looking across time can reveal patterns."],
  ["Trend", "A long-term direction in the data. A trend does not explain why a change happened."],
  ["Seasonal cycle", "A pattern that repeats on a regular calendar schedule, like warmer months each year."],
  ["Anomaly", "A value compared with a reference average, often after recurring seasonal patterns are considered."],
  ["Slope", "A measure of how quickly a quantity changes over time. The unit depends on the variable and time scale."],
  ["Statistical significance", "A test of whether a pattern is unlikely to be explained by random variation alone, given the assumptions."],
  ["Mann–Kendall test", "A non-parametric test often used to assess whether a time series has a consistent upward or downward trend."],
  ["Theil–Sen slope", "A robust estimate of a trend's rate of change, based on the median of pairwise slopes."],
  ["Confidence interval", "A range expressing uncertainty around an estimate. A wider interval generally means less precision."],
];
function AboutScience() {
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>FIELD GUIDE / READ THE EVIDENCE</Eyebrow><h1>About the science.</h1><p>Good investigations make the methods and uncertainty understandable.</p></div><PageArtwork variant="science" /><span className="case-label"><Microscope size={15} /> PLAIN-LANGUAGE GUIDE</span></div><div className="science-intro"><div className="science-icon"><FlaskConical size={23} /></div><div><h2>Observation is not explanation.</h2><p>Satellite and other Earth observations can help us understand environmental change. Careful analysis can identify patterns, but patterns alone cannot tell us their cause.</p></div></div><div className="concept-grid">{concepts.map(([name, text], index) => <article className="concept-card" key={name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><p>{text}</p></article>)}</div><section className="science-cautions"><Eyebrow>FOUR THINGS TO KEEP IN MIND</Eyebrow><div className="caution-grid"><Caution title="Significance is not causation" text="A significant trend does not prove what caused the change." /><Caution title="Not significant ≠ no trend" text="A trend can exist without enough evidence to pass a significance threshold." /><Caution title="Respect seasonal patterns" text="Recurring cycles should be accounted for before interpreting long-term change." /><Caution title="Check data quality" text="Missing observations, sensor changes and coverage gaps can affect conclusions." /></div></section><div className="sources-note"><Database size={17} /><span><b>About the data</b> — NASA Earth science datasets are not connected in this demo. Dataset names, units, coverage and analysis methods should be verified before producing findings.</span></div></div>;
}
function Caution({ title, text }) { return <div className="caution-card"><ShieldAlert size={16} /><div><b>{title}</b><p>{text}</p></div></div>; }

function Compare() {
  const [variable, setVariable] = useState(variables[0].id);
  const selected = variables.find((item) => item.id === variable) || variables[0];
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>COMPARATIVE INVESTIGATION / TWO CITIES</Eyebrow><h1>City vs city.</h1><p>Compare the same variable across Karachi and Lahore only when datasets are compatible.</p></div><PageArtwork variant="compare" /><span className="case-label"><Layers3 size={15} /> COMPARISON MODE</span></div><div className="comparison-callout"><ShieldAlert size={17} /><span>Comparison is unavailable until both locations have verified, compatible datasets with matching units and comparable time coverage.</span></div><label className="compare-variable">VARIABLE<div className="select-wrap"><TrendingUp size={15} /><select value={variable} onChange={(event) => setVariable(event.target.value)}>{variables.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div></label><div className="compare-grid">{locations.map((location, index) => <section className="panel compare-city" key={location.id}><div className="panel-heading"><div><span className="panel-index">CASE 00{index + 1}</span><h2>{location.name}</h2></div><span className="status-chip">DATA UNAVAILABLE</span></div><p className="compare-location"><MapPin size={14} />{location.province}, Pakistan</p><div className="compare-stat"><span>RATE OF CHANGE</span><b>—</b><small>Theil-Sen slope</small></div><div className="compare-stat-row"><div><span>P-VALUE</span><b>—</b></div><div><span>CONFIDENCE INTERVAL</span><b>—</b></div></div><div className="compare-chart"><TrendChart variableName={selected.name} unit={selected.unit} /></div></section>)}</div><div className="comparison-bottom"><CircleHelp size={16} /><span>Differences in trends do not imply that one city is responsible for environmental changes in another. Comparisons need compatible datasets, units and periods.</span></div></div>;
}

function NotFound() { return <div className="page-wrap not-found"><Eyebrow>RECORD NOT FOUND</Eyebrow><h1>This case is off the record.</h1><Link to="/cases" className="button button-primary">RETURN TO CASE FILES <ArrowRight size={15} /></Link></div>; }

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/wizard" element={<Wizard />} />
    <Route path="/lab" element={<Lab />} />
    <Route path="/cases" element={<CaseFiles />} />
    <Route path="/cases/:caseId" element={<CaseFileDetails />} />
    <Route path="/about" element={<AboutScience />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Layout>;
}
