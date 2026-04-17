import { useState } from "react";
import { MAJOR_LABELS } from "../hooks/useGoogleSheet";

const REGIONS    = ["USA", "UK", "India", "Asia", "Europe", "Canada", "Middle East", "Australia & NZ", "Rest of World"];
const LOCATIONS  = ["Big City", "Small City", "Countryside"];
const SIZES      = ["Small", "Medium", "Large"];
const CHANCES    = ["Selective", "Achievable"];
const chanceColors = { Selective: "var(--reach)", Achievable: "var(--safe)" };

const Pill = ({ label, active, onClick, color }) => {
  const ac = color || "var(--ink)";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 14px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase",
        border: active ? `1px solid ${ac}` : "1px solid var(--border)",
        background: active ? ac : "transparent",
        color: active ? "#fff" : "var(--muted)",
        cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap",
      }}
    >{label}</button>
  );
};

const FilterRow = ({ label, open, onToggle, children, activeCount }) => (
  <div style={{ borderBottom: "1px solid var(--border)" }}>
    <button
      onClick={onToggle}
      style={{
        width: "100%", padding: "10px var(--px, 16px)",
        display: "flex", alignItems: "center", gap: 10,
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
        color: open ? "var(--ink)" : "var(--muted)", textAlign: "left",
      }}
    >
      <span style={{ fontWeight: open ? 500 : 400 }}>{label}</span>
      {activeCount > 0 && (
        <span style={{ background: "var(--accent)", color: "#fff", fontSize: 9, padding: "1px 6px", borderRadius: 2 }}>
          {activeCount}
        </span>
      )}
      <span style={{ marginLeft: "auto", fontSize: 16, color: "var(--muted)", lineHeight: 1 }}>
        {open ? "\u2212" : "+"}
      </span>
    </button>
    {open && (
      <div style={{ padding: "0 var(--px, 16px) 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {children}
      </div>
    )}
  </div>
);

const FiltersBar = ({ search, setSearch, filters, setFilters }) => {
  const [open, setOpen] = useState({ major: false, region: false, location: false, size: false, chance: false });

  const tog = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const toggleF = (k, v) => setFilters((p) => {
    const arr = p[k] || [];
    return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const clearAll = () => {
    setFilters({ major: [], region: [], location: [], size: [], chance: [] });
    if (setSearch) setSearch("");
  };

  const hasActive = Object.values(filters).some((a) => a && a.length > 0) || search;
  const ac = (k) => (filters[k] || []).length;

  return (
    <div style={{ background: "var(--paper)", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 90 }}>
      {/* Search row */}
      {setSearch !== undefined && (
        <div style={{ padding: "12px var(--px, 16px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>&#x2315;</span>
            <input
              type="text" placeholder="Search colleges, regions, majors..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 14px 8px 32px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          {hasActive && (
            <button onClick={clearAll} style={{ padding: "7px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid var(--accent)", color: "var(--accent)", background: "transparent", cursor: "pointer" }}>
              Clear All
            </button>
          )}
        </div>
      )}
      {!setSearch && hasActive && (
        <div style={{ padding: "8px var(--px, 16px)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={clearAll} style={{ padding: "5px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid var(--accent)", color: "var(--accent)", background: "transparent", cursor: "pointer" }}>
            Clear Filters
          </button>
        </div>
      )}

      {/* 1. Major */}
      <FilterRow label="Major / Subject" open={open.major} onToggle={() => tog("major")} activeCount={ac("major")}>
        {MAJOR_LABELS.map((m) => <Pill key={m} label={m} active={(filters.major||[]).includes(m)} onClick={() => toggleF("major", m)} />)}
      </FilterRow>

      {/* 2. Region */}
      <FilterRow label="Region" open={open.region} onToggle={() => tog("region")} activeCount={ac("region")}>
        {REGIONS.map((r) => <Pill key={r} label={r} active={(filters.region||[]).includes(r)} onClick={() => toggleF("region", r)} />)}
      </FilterRow>

      {/* 3. Location Type */}
      <FilterRow label="Location" open={open.location} onToggle={() => tog("location")} activeCount={ac("location")}>
        {LOCATIONS.map((l) => <Pill key={l} label={l} active={(filters.location||[]).includes(l)} onClick={() => toggleF("location", l)} />)}
      </FilterRow>

      {/* 4. Size */}
      <FilterRow label="School Size" open={open.size} onToggle={() => tog("size")} activeCount={ac("size")}>
        {SIZES.map((s) => <Pill key={s} label={s} active={(filters.size||[]).includes(s)} onClick={() => toggleF("size", s)} />)}
      </FilterRow>

      {/* 5. Chance */}
      <FilterRow label="Admission Chance" open={open.chance} onToggle={() => tog("chance")} activeCount={ac("chance")}>
        {CHANCES.map((c) => <Pill key={c} label={c} active={(filters.chance||[]).includes(c)} onClick={() => toggleF("chance", c)} color={chanceColors[c]} />)}
      </FilterRow>
    </div>
  );
};

export default FiltersBar;
