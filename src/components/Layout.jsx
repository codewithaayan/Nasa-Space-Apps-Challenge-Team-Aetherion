import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import teamLogo from "../assets/team-logo.png";

const navItems = [
  ["Home", "/"],
  ["Investigate", "/wizard"],
  ["Case Files", "/cases"],
  ["How It Works", "/science"],
  ["About", "/about"],
];

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Rosenzweig Index home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><img src={teamLogo} alt="Team Aetherion logo" /></span>
          <span className="brand-name">ROSENZWEIG <b>INDEX</b><small>EARTH INSIGHTS</small></span>
        </Link>
        <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Main navigation">
          {navItems.map(([label, to]) => (
            <NavLink key={label} to={to} end={to === "/"} onClick={() => setMenuOpen(false)}>{label}</NavLink>
          ))}
          <Link className="nav-compare" to="/compare" onClick={() => setMenuOpen(false)}>City comparison <span>↗</span></Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <Link to="/" className="footer-brand" aria-label="Rosenzweig Index home">
          <img src={teamLogo} alt="Team Aetherion logo" />
          <span className="footer-brand-name">ROSENZWEIG INDEX</span>
        </Link>
        <span className="footer-project">TEAM AETHERION PROJECT | NASA SPACE APPS CHALLENGE 2026</span>
        <span className="footer-data-note">Source data · Exploratory analysis · Scientific review pending</span>
        <Link to="/science">How the science works <span>↗</span></Link>
      </footer>
    </div>
  );
}

export function Eyebrow({ children, className = "" }) {
  return <div className={`eyebrow ${className}`}><span className="eyebrow-line" />{children}</div>;
}

export function SectionHeading({ label, title, description, action }) {
  return (
    <div className="section-heading">
      <div><Eyebrow>{label}</Eyebrow><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

export function StatusNotice({ children }) {
  return <div className="status-notice"><span className="status-dot" />{children}</div>;
}
