import { Link, NavLink } from "react-router-dom";
import { Activity, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  ["Home", "/"],
  ["Investigate", "/wizard"],
  ["Case Files", "/cases"],
  ["How It Works", "/about"],
  ["About", "/about"],
];

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Trend Detective home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Activity size={19} /></span>
          <span className="brand-name">TREND <b>DETECTIVE</b><small>CASE FILES</small></span>
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
        <div className="demo-badge"><span /> EXPLORATORY</div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <Link to="/" className="footer-brand">TREND DETECTIVE <span>·</span> CASE FILES</Link>
        <span>Source data · Exploratory analysis · Scientific review pending</span>
        <Link to="/about">About the science <span>↗</span></Link>
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
