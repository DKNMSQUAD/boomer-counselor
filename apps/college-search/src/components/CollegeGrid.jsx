import CollegeCard from "./CollegeCard";
const CollegeGrid = ({ colleges, hasPurchased, onViewReport, shortlist, onToggleShortlist, emptyMessage }) => {
  if (colleges.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(20px, 5vw, 28px)", marginBottom: 10, color: "var(--ink)" }}>
          {emptyMessage || "No colleges found"}
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {emptyMessage ? "Add colleges to your shortlist from the All Colleges tab." : "Adjust filters or search to see results."}
        </p>
      </div>
    );
  }
  return (
    <section className="app-section">
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 1 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(15px, 4vw, 18px)", fontWeight: 700, letterSpacing: "-0.3px" }}>
          College Dossiers
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {colleges.length} result{colleges.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="college-grid">
        {colleges.map((c) => (
          <CollegeCard
            key={c.id}
            college={c}
            hasPurchased={hasPurchased}
            isShortlisted={shortlist.includes(c.id)}
            onViewReport={onViewReport}
            onToggleShortlist={onToggleShortlist}
          />
        ))}
      </div>
    </section>
  );
};
export default CollegeGrid;
