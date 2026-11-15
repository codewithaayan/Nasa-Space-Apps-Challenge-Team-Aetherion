import { Link, Route, Routes } from "react-router-dom";
import { ArrowRight, Clock3, ClipboardList, Database, FlaskConical, Layers3, Microscope, Search, ShieldAlert } from "lucide-react";
import { locations } from "./data";
import { Layout, Eyebrow, SectionHeading, StatusNotice } from "./components/Layout";
import { LocationArtwork, PageArtwork } from "./components/Artwork";
import { EarthGlobe3D } from "./components/EarthGlobe3D";
import { CatalogProvider, useCatalog, Wizard, Lab, CaseFiles, CaseFileDetails, Compare, PreparedCase } from "./features/Investigations";

function Home() {
  const { datasets } = useCatalog();
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
        <div className="hero-visual" aria-label="Interactive 3D Earth observation visualization">
          <EarthGlobe3D />
        </div>
      </section>
      <section className="page-wrap home-section">
        <SectionHeading label="START WITH A PLACE" title="Explore Pakistan's environmental records." description="Choose a place to investigate the supplied source exports. Every result includes its coverage, units and scientific limitations." action={<Link to="/cases" className="text-link">ALL CASE FILES <ArrowRight size={15} /></Link>} />
        <div className="city-grid">{locations.map((location, index) => <CityCard key={location.id} location={location} index={index} />)}</div>
      </section>
      <section className="process-band">
        <div className="page-wrap">
          <SectionHeading label="THE METHOD" title="Every finding follows the evidence." description="A transparent path from documented source data to an understandable investigation." />
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
  const { datasets } = useCatalog();
  const available = datasets.some(d => d.location_id === location.id);
  return (
    <article className={`city-card city-${index}`}>
      <div className="city-art"><LocationArtwork locationId={location.id} className="city-location-art" /><span className="city-coord">{location.lat.toFixed(2)}° N / {location.lng.toFixed(2)}° E</span></div>
      <div className="city-card-content">
        <div className="city-card-kicker"><span>{location.code}</span><span className="available"><i /> {available ? "SOURCE EXPORTS" : "AWAITING DATA"}</span></div>
        <h3>{location.name}</h3><p>{location.kind} · {location.province}, Pakistan</p>
        <div className="city-card-bottom"><span>{available ? "EXPLORATORY INVESTIGATION" : "PLANNED CASE"}</span><Link to="/wizard" state={{ locationId: location.id }} aria-label={`Investigate ${location.name}`} className="round-arrow"><ArrowRight size={17} /></Link></div>
      </div>
    </article>
  );
}

function FeatureCard({ icon: Icon, number, title, text }) {
  return <article className="feature-card"><div className="feature-top"><span>{number}</span><Icon size={18} /></div><h3>{title}</h3><p>{text}</p><span className="feature-line" /></article>;
}

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
  return <div className="page-wrap page-content"><div className="page-title-row"><div><Eyebrow>FIELD GUIDE / READ THE EVIDENCE</Eyebrow><h1>About the science.</h1><p>Good investigations make the methods and uncertainty understandable.</p></div><PageArtwork variant="science" /><span className="case-label"><Microscope size={15} /> PLAIN-LANGUAGE GUIDE</span></div><div className="science-intro"><div className="science-icon"><FlaskConical size={23} /></div><div><h2>Observation is not explanation.</h2><p>Satellite and other Earth observations can help us understand environmental change. Careful analysis can identify patterns, but patterns alone cannot tell us their cause.</p></div></div><div className="concept-grid">{concepts.map(([name, text], index) => <article className="concept-card" key={name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{name}</h3><p>{text}</p></article>)}</div><section className="science-cautions"><Eyebrow>FOUR THINGS TO KEEP IN MIND</Eyebrow><div className="caution-grid"><Caution title="Significance is not causation" text="A significant trend does not prove what caused the change." /><Caution title="Not significant ≠ no trend" text="A trend can exist without enough evidence to pass a significance threshold." /><Caution title="Respect seasonal patterns" text="Recurring cycles should be accounted for before interpreting long-term change." /><Caution title="Check data quality" text="Missing observations, sensor changes and coverage gaps can affect conclusions." /></div></section><div className="sources-note"><Database size={17} /><span><b>About the data</b> — Supplied source exports for Karachi, Lahore, Gilgit, Islamabad, Peshawar and Quetta are connected for exploratory analysis. Product types include satellite estimates, reanalysis and land-model output. Sources, units, coverage and limitations accompany each result; scientific review remains pending.</span></div></div>;
}
function Caution({ title, text }) { return <div className="caution-card"><ShieldAlert size={16} /><div><b>{title}</b><p>{text}</p></div></div>; }

function NotFound() { return <div className="page-wrap not-found"><Eyebrow>RECORD NOT FOUND</Eyebrow><h1>This case is off the record.</h1><Link to="/cases" className="button button-primary">RETURN TO CASE FILES <ArrowRight size={15} /></Link></div>; }

export default function App() {
  return <CatalogProvider><Layout><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/wizard" element={<Wizard />} />
    <Route path="/lab" element={<Lab />} />
    <Route path="/cases" element={<CaseFiles />} />
    <Route path="/cases/demo/:caseId" element={<PreparedCase />} />
    <Route path="/cases/:caseId" element={<CaseFileDetails />} />
    <Route path="/about" element={<AboutScience />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Layout></CatalogProvider>;
}
