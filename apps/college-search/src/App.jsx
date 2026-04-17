import { useState, useMemo } from "react";
import Masthead    from "./components/Masthead";
import FiltersBar  from "./components/FiltersBar";
import CollegeGrid from "./components/CollegeGrid";
import ReportModal from "./components/ReportModal";
import { useGoogleSheet } from "./hooks/useGoogleSheet";
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfUse from './components/TermsOfUse';
import { InstallPrompt } from "./InstallPrompt";
import { usePurchases }   from "./hooks/usePurchases";

const SHORTLIST_KEY = "nm_squad_shortlist";
const EMPTY_FILTERS = { major: [], region: [], location: [], size: [], chance: [] };

function App() {
  const { colleges, loading, error } = useGoogleSheet();
  const { hasPurchased, addPurchase } = usePurchases();

  const [activeTab, setActiveTab] = useState("all");
  const [search,    setSearch]    = useState("");
  const [filters,   setFilters]   = useState(EMPTY_FILTERS);
  const [slFilters, setSlFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [shortlist, setShortlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SHORTLIST_KEY) || "[]"); }
    catch { return []; }
  });

  const toggleShortlist = (id) => {
    setShortlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(SHORTLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const applyFilters = (list, f, q) => list.filter((c) => {
    const matchSearch   = !q || c.name.toLowerCase().includes(q) || (c.region||"" ).toLowerCase().includes(q) || (c.location||"" ).toLowerCase().includes(q) || c.majors.some((m) => m.toLowerCase().includes(q));
    const matchRegion   = !f.region.length   || f.region.includes(c.region);
    const matchSize     = !f.size.length     || f.size.includes(c.size);
    const matchChance   = !f.chance.length   || f.chance.includes(c.chance);
    const matchMajor    = !f.major.length    || f.major.some((m) => c.majors.includes(m));
    const matchLocation = !f.location.length || f.location.some((l) => (c.location||"" ).toLowerCase().includes(l.toLowerCase()));
    return matchSearch && matchRegion && matchSize && matchChance && matchMajor && matchLocation;
  });

  const filtered    = useMemo(() => applyFilters(colleges, filters, search.toLowerCase()),        [colleges, filters, search]);
  const shortlisted = useMemo(() => colleges.filter((c) => shortlist.includes(c.id)),             [colleges, shortlist]);
  const slFiltered  = useMemo(() => applyFilters(shortlisted, slFilters, ""),                     [shortlisted, slFilters]);

  const Tab = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "14px 32px",
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.1em", textTransform: "uppercase",
        background: activeTab === id ? "var(--bg)" : "transparent",
        border: "none",
        borderRight: "1px solid var(--border)",
        borderBottom: activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
        color: activeTab === id ? "var(--ink)" : "var(--muted)",
        cursor: "pointer", transition: "all 0.12s",
        position: "relative", bottom: "-2px",
      }}
    >
      {label}
      {count > 0 && (
        <span style={{ marginLeft: 8, background: activeTab === id ? "var(--accent)" : "var(--border)", color: activeTab === id ? "#fff" : "var(--muted)", fontSize: 9, padding: "2px 6px", borderRadius: 2 }}>
          {count}
        </span>
      )}
    </button>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/nm-logo.png" alt="NM Squad" style={{ height: 80, width: 80, objectFit: "contain", opacity: 0.7, animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "var(--accent)" }}>Sync Error</div>
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>{error}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <Masthead colleges={colleges} />

      {/* Tab bar */}
      <div className="app-tabbar" style={{ display: "flex", borderBottom: "2px solid var(--border)", background: "var(--paper)", position: "sticky", top: 0, zIndex: 100 }}>
        <Tab id="all"       label="All Colleges" count={filtered.length}   />
        <Tab id="shortlist" label="Shortlisted"  count={shortlist.length} />
      </div>

      {/* All Colleges tab */}
      {activeTab === "all" && (
        <>
          <FiltersBar search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} />
          <CollegeGrid
            colleges={filtered}
            hasPurchased={hasPurchased}
            onViewReport={setSelected}
            shortlist={shortlist}
            onToggleShortlist={toggleShortlist}
            emptyMessage=""
          />
        </>
      )}

      {/* Shortlist tab */}
      {activeTab === "shortlist" && (
        <>
          <FiltersBar filters={slFilters} setFilters={setSlFilters} />
          <CollegeGrid
            colleges={slFiltered}
            hasPurchased={hasPurchased}
            onViewReport={setSelected}
            shortlist={shortlist}
            onToggleShortlist={toggleShortlist}
            emptyMessage={shortlisted.length === 0 ? "No colleges shortlisted yet" : ""}
          />
        </>
      )}

      <footer className="app-footer" style={{ borderTop: "1px solid var(--border)", marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        <span>&copy; 2026 NM Squad &mdash; Neeraj Mandhana. All rights reserved.</span>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <button onClick={()=>setShowPrivacy(true)} style={{background:'none',border:'none',color:'var(--muted)',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer',padding:0,textDecoration:'underline'}}>Privacy Policy</button>
          <button onClick={()=>setShowTerms(true)} style={{background:'none',border:'none',color:'var(--muted)',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer',padding:0,textDecoration:'underline'}}>Terms of Use</button>
        </div>
      </footer>

      <InstallPrompt />
      {showPrivacy && <PrivacyPolicy onClose={()=>setShowPrivacy(false)} />}
      {showTerms && <TermsOfUse onClose={()=>setShowTerms(false)} />}
      {selected && (
        <ReportModal college={selected} hasPurchased={hasPurchased} onPurchase={addPurchase} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default App;
