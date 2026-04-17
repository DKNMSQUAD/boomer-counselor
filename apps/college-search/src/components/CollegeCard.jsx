import { useState } from "react";
const chanceStyle = {
  Selective:  { color: "var(--reach)", bg: "rgba(192,57,43,0.08)" },
  Achievable: { color: "var(--safe)",  bg: "rgba(39,174,96,0.08)"  },
};
const Tag = ({ label, color }) => (
  <span style={{ fontSize: 8, letterSpacing: "0.07em", textTransform: "uppercase", padding: "2px 8px", border: `1px solid ${color || "var(--border)"}`, color: color || "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{label}</span>
);
const CollegeCard = ({ college, hasPurchased, isShortlisted, onViewReport, onToggleShortlist }) => {
  const [logoErr, setLogoErr] = useState(false);
  const cs      = chanceStyle[college.chance] || { color: "var(--muted)", bg: "transparent" };
  const unlocked  = hasPurchased(college.id);
  const hasReport = !!college.reportUrl;
  return (
    <div
      style={{ background: "var(--paper)", padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 8, transition: "background 0.1s", position: "relative" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--paper)")}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: cs.color }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 52, height: 40, flexShrink: 0, border: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 3 }}>
            {!logoErr && college.logo ? (
              <img src={college.logo} alt={college.name} onError={() => setLogoErr(true)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
            ) : (
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{college.name.charAt(0)}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2, marginBottom: 2 }}>{college.name}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{[college.location, college.region].filter(Boolean).join(" \u00b7 ")}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
            {college.chance && (
              <span style={{ fontSize: 8, letterSpacing: "0.07em", textTransform: "uppercase", padding: "2px 8px", border: `1px solid ${cs.color}`, color: cs.color, background: cs.bg, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{college.chance}</span>
            )}
            {unlocked && <Tag label="Unlocked" color="var(--accent3)" />}
          </div>
        </div>
        {college.majors && college.majors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            <Tag label={college.size} />
            {college.majors.slice(0, 4).map((m) => <Tag key={m} label={m} />)}
            {college.majors.length > 4 && <Tag label={`+${college.majors.length - 4}`} />}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => onToggleShortlist(college.id)}
            style={{ padding: "4px 10px", border: isShortlisted ? "1px solid #8e44ad" : "1px solid var(--border)", background: isShortlisted ? "#8e44ad" : "transparent", color: isShortlisted ? "#fff" : "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}
          >
            {isShortlisted ? "\u2665 Shortlisted" : "\u2661 Shortlist"}
          </button>
          {hasReport && unlocked ? (
            <button
              onClick={() => onViewReport(college)}
              style={{ padding: "5px 14px", background: "var(--ink)", color: "var(--bg)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ink)")}
            >
              View Report
            </button>
          ) : (
            <span></span>
          )}
        </div>
      </div>
    </div>
  );
};
export default CollegeCard;
