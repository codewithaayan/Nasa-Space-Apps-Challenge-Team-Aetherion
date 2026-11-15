import { Link, Route, Routes } from "react-router-dom";
import { ArrowRight, BookOpen, Clock3, ClipboardList, Database, ExternalLink, Eye, Layers3, Search, Target, UsersRound } from "lucide-react";
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
          <div className="hero-proof"><span><b>06</b> CITY LOCATIONS</span><i /><span><b>NASA</b> EARTH SCIENCE</span><i /><span><b>01</b> MISSION: FIND THE TREND</span></div>
        </div>
        <div className="hero-visual" aria-label="Interactive 3D Earth observation visualization">
          <EarthGlobe3D />
        </div>
      </section>
      <section className="page-wrap home-section">
        <SectionHeading label="START WITH A PLACE" title="Six cities. Your investigation." description="Choose a place to investigate the supplied source exports across Pakistan. Every result includes its coverage, units and scientific limitations." action={<Link to="/cases" className="text-link">ALL CASE FILES <ArrowRight size={15} /></Link>} />
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
          <FeatureCard icon={Clock3} number="02" title="Years-to-Significance" text="Coming soon. Estimates of how much additional data is needed are not available yet." />
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

const teamMembers = [
  { name: "Aayan", role: "Frontend development", contribution: "Shapes the interface and makes the investigation tools clear and usable." },
  { name: "Abdullah", role: "Backend & scientific calculations", contribution: "Builds the APIs, data schemas and analysis that support each investigation." },
  { name: "Rhido", role: "NASA data & platform operations", contribution: "Works on data ingestion, cataloguing, caching and prepared case materials." },
  { name: "Waseel", role: "Analysis workflow & validation support", contribution: "Develops the investigation wizard and verdict experience, with scientific validation support." },
  { name: "Ayesha", role: "Research & presentation", contribution: "Leads research and helps communicate the project and its findings through presentation." },
];
function AboutUs() {
  return (
    <div className="page-wrap page-content about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero-copy">
          <Eyebrow>ABOUT TEAM AETHERION</Eyebrow>
          <h1 id="about-title">Meet the team behind <span>Rosenzweig Index.</span></h1>
          <p>We are Team Aetherion, a student-led team bringing software, environmental research and clear communication together to make Earth data easier to explore.</p>
          <div className="about-actions">
            <a href="#team" className="button button-primary">MEET THE TEAM <UsersRound size={15} /></a>
            <Link to="/science" className="button button-secondary">HOW IT WORKS <ArrowRight size={16} /></Link>
          </div>
        </div>
        <div className="about-hero-art" aria-hidden="true">
          <PageArtwork variant="science" />
        </div>
      </section>

      <section className="about-story" aria-labelledby="about-who-title">
        <div className="about-story-copy">
          <Eyebrow>WHO WE ARE</Eyebrow>
          <h2 id="about-who-title">Different skills.<br />One shared mission.</h2>
          <p>Our team combines frontend and backend development, data workflows, scientific analysis support, research and presentation. We want environmental evidence to feel approachable, while keeping its source and uncertainty in view.</p>
        </div>
        <div className="about-values-grid" aria-label="Our mission and vision">
          <article className="about-value-card">
            <Target size={18} />
            <h3>Our mission</h3>
            <p>Make environmental data easier to explore and its results easier to understand.</p>
          </article>
          <article className="about-value-card about-value-card-alt">
            <Eye size={18} />
            <h3>Our principle</h3>
            <p>Keep the evidence, source and limitations together—so a pattern is never mistaken for its cause.</p>
          </article>
        </div>
      </section>

      <section className="about-namesake-section" aria-labelledby="about-namesake-title">
        <div className="about-section-heading">
          <Eyebrow>THE NAME BEHIND THE PROJECT</Eyebrow>
          <h2 id="about-namesake-title">Inspired by two Rosenzweigs.</h2>
          <p>The name recognizes two distinct scientific contributions that motivate our interest in environmental change and its effects on living systems.</p>
        </div>
        <div className="about-scientist-grid">
          <article className="about-scientist-card">
            <span className="about-scientist-field">CLIMATE & FOOD SYSTEMS</span>
            <h3>Cynthia E. Rosenzweig</h3>
            <p>A NASA Goddard Institute for Space Studies climate scientist, she studies how climate variability and change affect people and vital systems. She co-founded AgMIP, an international effort to compare agricultural models and assess climate impacts on food systems.</p>
            <a href="https://people.climate.columbia.edu/users/profile/cynthia-ropes-rosenzweig" target="_blank" rel="noreferrer">Columbia Climate School profile <ExternalLink size={13} /></a>
          </article>
          <article className="about-scientist-card">
            <span className="about-scientist-field">ECOLOGY & BIODIVERSITY</span>
            <h3>Michael L. Rosenzweig</h3>
            <p>An ecologist known for research on species diversity and reconciliation ecology: adapting human-used places so they can also support biodiversity. His work offers a complementary perspective on how people and nature share changing environments.</p>
            <a href="https://experts.arizona.edu/en/publications/reconciliation-ecology-and-the-future-of-species-diversity/" target="_blank" rel="noreferrer">University of Arizona research profile <ExternalLink size={13} /></a>
            <a href="https://doi.org/10.1017/cbo9780511623387" target="_blank" rel="noreferrer">Species Diversity in Space and Time <ExternalLink size={13} /></a>
          </article>
        </div>
        <p className="about-namesake-note">Rosenzweig Index is our project name—not a standardized index developed by either scientist or an endorsement by them.</p>
      </section>

      <section className="about-team-section" id="team" aria-labelledby="about-team-title">
        <div className="about-section-heading">
          <Eyebrow>MEET THE TEAM</Eyebrow>
          <h2 id="about-team-title">The people building it.</h2>
        </div>
        <div className="about-team-grid">
          {teamMembers.map(member => (
            <article className="about-member-card" key={member.name}>
              <span className="about-member-avatar" aria-hidden="true">{member.name[0]}</span>
              <h3>{member.name}</h3>
              <span className="about-member-role">{member.role}</span>
              <p>{member.contribution}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div><Eyebrow>EXPLORE THE PROJECT</Eyebrow><h2>Start with a question.<br /><span>Follow the evidence.</span></h2></div>
        <Link to="/wizard" className="button button-primary">START AN INVESTIGATION <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}

function HowItWorks() {
  const { datasets, loading, error } = useCatalog();
  const registeredPlaces = new Set(datasets.map(dataset => dataset.location_id).filter(id => locations.some(location => location.id === id))).size;
  const steps = [
    { number: "01", title: "Choose a question", text: "Select an environmental variable, a location and a time range in the investigation wizard.", icon: Search },
    { number: "02", title: "Check the source", text: "Review the dataset, units, coverage and spatial support before running an analysis.", icon: Database },
    { number: "03", title: "Explore the evidence", text: "Plot monthly values, inspect the trend and review statistical results with their uncertainty.", icon: Layers3 },
    { number: "04", title: "Interpret with care", text: "Use the case report to summarize what the data supports—and what it cannot establish.", icon: BookOpen },
  ];
  return (
    <div className="page-wrap page-content how-page">
      <header className="how-hero">
        <div>
          <Eyebrow>ROSENZWEIG INDEX / GUIDE</Eyebrow>
          <h1>How it works</h1>
          <p>Follow a clear path from a research question to a source-backed environmental trend investigation.</p>
          <Link to="/wizard" className="button button-primary">START AN INVESTIGATION <ArrowRight size={16} /></Link>
        </div>
        <PageArtwork variant="science" />
      </header>

      <section className="how-workflow" aria-labelledby="how-workflow-title">
        <div className="how-section-heading">
          <Eyebrow>THE WORKFLOW</Eyebrow>
          <h2 id="how-workflow-title">Four steps. Evidence at every step.</h2>
        </div>
        <div className="how-step-grid">
          {steps.map(({ number, title, text, icon: Icon }) => (
            <article className="how-step-card" key={number}>
              <div className="how-step-top"><span>{number}</span><Icon size={19} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-method" aria-labelledby="how-method-title">
        <div className="how-method-copy">
          <Eyebrow>THE ANALYSIS</Eyebrow>
          <h2 id="how-method-title">A trend is a signal—not an explanation.</h2>
          <p>The platform displays data at its supplied time scale and reports trend statistics with source context. Statistical significance does not identify a cause, and a result depends on the dataset, coverage and method assumptions.</p>
        </div>
        <div className="how-method-list">
          <div><b>Trend direction</b><span>Shows whether the analyzed series rises or falls under the selected method.</span></div>
          <div><b>Statistical significance</b><span>Indicates evidence against a no-trend assumption; it does not measure importance or prove causation.</span></div>
          <div><b>Source limitations</b><span>Reanalysis, satellite estimates and model products represent different kinds of evidence and are not interchangeable.</span></div>
        </div>
      </section>

      <aside className="how-data-status" role={loading || error ? "status" : undefined}>
        <Database size={18} />
        <div>
          <b>{loading ? "Checking the dataset catalog…" : error ? "Dataset catalog unavailable" : `${registeredPlaces} of ${locations.length} locations have registered datasets`}</b>
          <p>{error || "Available variables, date ranges and spatial coverage depend on each registered source. Check the catalog in the investigation wizard before interpreting a result."}</p>
        </div>
      </aside>
    </div>
  );
}

function NotFound() { return <div className="page-wrap not-found"><Eyebrow>RECORD NOT FOUND</Eyebrow><h1>This case is off the record.</h1><Link to="/cases" className="button button-primary">RETURN TO CASE FILES <ArrowRight size={15} /></Link></div>; }

export default function App() {
  return <CatalogProvider><Layout><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/wizard" element={<Wizard />} />
    <Route path="/lab" element={<Lab />} />
    <Route path="/cases" element={<CaseFiles />} />
    <Route path="/cases/demo/:caseId" element={<PreparedCase />} />
    <Route path="/cases/:caseId" element={<CaseFileDetails />} />
    <Route path="/about" element={<AboutUs />} />
    <Route path="/science" element={<HowItWorks />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Layout></CatalogProvider>;
}
