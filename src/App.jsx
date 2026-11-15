import { Link, Route, Routes } from "react-router-dom";
import { ArrowRight, BookOpen, Clock3, Code2, ClipboardList, Database, ExternalLink, Eye, FlaskConical, Globe2, Layers3, Lightbulb, Search, ShieldAlert, Target, UsersRound } from "lucide-react";
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
const teamMembers = [
  { name: "Aayan", role: "Frontend development", contribution: "Shapes the interface and makes the investigation tools clear and usable." },
  { name: "Abdullah", role: "Backend & scientific calculations", contribution: "Builds the APIs, data schemas and analysis that support each investigation." },
  { name: "Rhido", role: "NASA data & platform operations", contribution: "Works on data ingestion, cataloguing, caching and prepared case materials." },
  { name: "Waseel", role: "Analysis workflow & validation support", contribution: "Develops the investigation wizard and verdict experience, with scientific validation support." },
  { name: "Ayesha", role: "Research & presentation", contribution: "Leads research and helps communicate the project and its findings through presentation." },
];
const projectTools = [
  ["Interactive interface", "React, Vite and Three.js", Code2],
  ["Scientific services", "Python, FastAPI, NumPy, Pandas and SciPy", FlaskConical],
  ["Earth observation", "Source-specific environmental datasets with provenance", Globe2],
  ["Clear explanations", "Charts, case files and plain-language methods", BookOpen],
];
const journeySteps = [
  ["01", "Ask a question", "Start with the challenge of making environmental change easier to investigate."],
  ["02", "Research the evidence", "Identify relevant datasets, variables and methods before interpreting results."],
  ["03", "Build the case file", "Connect data, statistical analysis and visual explanations in one workflow."],
  ["04", "Review the limits", "Keep provenance, uncertainty and scientific limitations visible."],
  ["05", "Keep improving", "Expand carefully as compatible, documented datasets become available."],
];

function AboutUs() {
  return (
    <div className="page-wrap page-content about-page">
      <section className="about-hero" aria-labelledby="about-title">
        <div className="about-hero-copy">
          <Eyebrow>ABOUT TEAM AETHERION</Eyebrow>
          <h1 id="about-title">Making Earth’s changing patterns <span>easier to understand.</span></h1>
          <p>We are Team Aetherion, a student-led team exploring how Earth observation data can reveal meaningful patterns about our planet. Rosenzweig Index turns complex environmental datasets into visual investigations and accessible scientific insights.</p>
          <div className="about-actions">
            <Link to="/cases" className="button button-primary">EXPLORE THE PROJECT <ArrowRight size={16} /></Link>
            <a href="#team" className="button button-secondary">MEET THE TEAM <UsersRound size={15} /></a>
          </div>
        </div>
        <div className="about-hero-art" aria-hidden="true">
          <PageArtwork variant="science" />
        </div>
      </section>

      <section className="about-intro" aria-labelledby="about-who-title">
        <div>
          <Eyebrow>WHO WE ARE</Eyebrow>
          <h2 id="about-who-title">Curious minds. One planet. Countless discoveries.</h2>
        </div>
        <p>We bring together programming, scientific research, data analysis and creative problem-solving. We believe environmental evidence should be approachable—not only to specialists—and that clear explanations help more people ask better questions about a changing planet.</p>
      </section>

      <section className="about-namesake-section" aria-labelledby="about-namesake-title">
        <div className="about-section-heading">
          <Eyebrow>THE NAME BEHIND THE PROJECT</Eyebrow>
          <h2 id="about-namesake-title">Why “Rosenzweig Index”?</h2>
          <p>The name honors two scientists whose distinct research inspires our interest in environmental change: climate impacts on people and food systems, and the conservation of biodiversity in human-shaped landscapes.</p>
        </div>
        <div className="about-scientist-grid">
          <article className="about-scientist-card">
            <span className="about-scientist-field">CLIMATE / FOOD SYSTEMS</span>
            <h3>Cynthia E. Rosenzweig</h3>
            <p>A climate scientist at NASA’s Goddard Institute for Space Studies, Rosenzweig leads research on how climate variability and change affect systems important to human well-being. Her work has helped advance climate-impact research across agriculture and cities; she co-founded AgMIP, an international collaboration comparing agricultural models and assessing climate risks to food systems.</p>
            <a href="https://people.climate.columbia.edu/users/profile/cynthia-ropes-rosenzweig" target="_blank" rel="noreferrer">Columbia Climate School profile <ExternalLink size={13} /></a>
          </article>
          <article className="about-scientist-card">
            <span className="about-scientist-field">ECOLOGY / BIODIVERSITY</span>
            <h3>Michael L. Rosenzweig</h3>
            <p>An influential ecologist, Rosenzweig’s research examined patterns of species diversity across space and time. He developed the idea of reconciliation ecology: redesigning human-modified environments so they can support more biodiversity alongside human uses. This offers a complementary perspective on how people and changing environments interact.</p>
            <a href="https://experts.arizona.edu/en/publications/reconciliation-ecology-and-the-future-of-species-diversity/" target="_blank" rel="noreferrer">University of Arizona research profile <ExternalLink size={13} /></a>
            <a href="https://doi.org/10.1017/cbo9780511623387" target="_blank" rel="noreferrer">Species Diversity in Space and Time <ExternalLink size={13} /></a>
          </article>
        </div>
        <p className="about-namesake-note">“Rosenzweig Index” is our project name—not a published or standardized index created by either scientist, and not an endorsement or collaboration with them.</p>
      </section>

      <section className="about-values-grid" aria-label="Our mission and vision">
        <article className="about-value-card">
          <span className="about-icon"><Target size={19} /></span>
          <Eyebrow>OUR MISSION</Eyebrow>
          <h2>Make investigation accessible.</h2>
          <p>Help people explore documented Earth science data and discover environmental trends through understandable, interactive tools.</p>
        </article>
        <article className="about-value-card about-value-card-alt">
          <span className="about-icon"><Eye size={19} /></span>
          <Eyebrow>OUR VISION</Eyebrow>
          <h2>More people, closer to the evidence.</h2>
          <p>A world where anyone can explore Earth’s changing systems, understand what the evidence can—and cannot—show, and make informed decisions.</p>
        </article>
      </section>

      <section className="about-project-section" aria-labelledby="about-project-title">
        <div className="about-section-heading">
          <Eyebrow>WHY WE BUILT IT</Eyebrow>
          <h2 id="about-project-title">Turn data into discoveries.</h2>
          <p>Environmental datasets can hold valuable signals, but long time series and statistical methods are not always easy to navigate. Rosenzweig Index brings the investigation steps together and explains the evidence in context.</p>
        </div>
        <div className="about-project-panel">
          <div className="about-project-lead">
            <span className="about-icon"><Lightbulb size={19} /></span>
            <h3>One case file. A clearer path through the data.</h3>
            <p>Choose an available dataset, review its coverage, explore the time series and examine the statistical result alongside its source and limitations.</p>
          </div>
          <div className="about-capability-list">
            {[
              "Explore environmental datasets that are connected to the platform.",
              "Visualize time-series changes and compare selected locations where compatible data exists.",
              "Review trend direction, statistical significance and uncertainty.",
              "Read plain-language findings without treating correlation as cause.",
            ].map((text, index) => <div className="about-capability" key={text}><span>0{index + 1}</span><p>{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="about-principles" aria-labelledby="about-principles-title">
        <div className="about-section-heading">
          <Eyebrow>OUR APPROACH</Eyebrow>
          <h2 id="about-principles-title">Useful insights, grounded in evidence.</h2>
        </div>
        <div className="about-principle-grid">
          {[
            ["Data with provenance", "Know which source, variable, units and coverage support an investigation.", Database],
            ["Methods made visible", "Use established statistical methods and explain what their results mean.", FlaskConical],
            ["Explore interactively", "Move through locations, time ranges, charts and case files in one place.", Globe2],
            ["Explain with care", "Make findings readable while keeping uncertainty and limitations in view.", BookOpen],
          ].map(([title, text, Icon]) => <article className="about-principle-card" key={title}><Icon size={19} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="about-team-section" id="team" aria-labelledby="about-team-title">
        <div className="about-section-heading">
          <Eyebrow>MEET THE TEAM</Eyebrow>
          <h2 id="about-team-title">The minds behind the mission.</h2>
          <p>Different skills, one shared goal: making environmental evidence easier to explore.</p>
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

      <section className="about-tech-section" aria-labelledby="about-tech-title">
        <div className="about-section-heading">
          <Eyebrow>OUR TECHNOLOGY</Eyebrow>
          <h2 id="about-tech-title">Built with technology. Driven by curiosity.</h2>
        </div>
        <div className="about-tech-grid">
          {projectTools.map(([title, description, Icon]) => <article className="about-tech-card" key={title}><Icon size={18} /><div><h3>{title}</h3><p>{description}</p></div></article>)}
        </div>
      </section>

      <section className="about-journey-section" aria-labelledby="about-journey-title">
        <div className="about-section-heading">
          <Eyebrow>OUR JOURNEY</Eyebrow>
          <h2 id="about-journey-title">From a question to an investigation.</h2>
        </div>
        <div className="about-journey-grid">
          {journeySteps.map(([number, title, description]) => <article className="about-journey-step" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>


      <section className="about-cta">
        <div><Eyebrow>THE EARTH HAS STORIES TO TELL</Eyebrow><h2>Explore the data.<br /><span>Follow the evidence.</span></h2></div>
        <Link to="/cases" className="button button-primary">EXPLORE CASE FILES <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}

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
    <Route path="/about" element={<AboutUs />} />
    <Route path="/science" element={<AboutScience />} />
    <Route path="/compare" element={<Compare />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Layout></CatalogProvider>;
}
