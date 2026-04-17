const Masthead = ({ colleges }) => {
  const countryCount = new Set(colleges.map((c) => c.region).filter(Boolean)).size;
  const collegeCount = colleges.length;
  return (
    <header className="app-header" style={{ borderBottom: "2px solid var(--ink)" }}>
      <div className="masthead-inner">
        <img src="/nm-logo.png" alt="NM Squad" className="masthead-logo" style={{ objectFit: "contain", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="masthead-title" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1, letterSpacing: "-1.5px" }}>
            College Search
          </div>
          <div className="masthead-subtitle" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontStyle: "italic", color: "var(--accent)", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            By NM Squad
          </div>
        </div>
        <div className="masthead-stats" style={{ flexShrink: 0, textAlign: "right", flexDirection: "column", gap: 5 }}>
          {[
            { val: "9 Regions",                 color: "#9F978C" },
            { val: collegeCount + " Colleges",  color: "#9F978C" },
            { val: "1,000s Of Courses",          color: "#9F978C" },
            { val: "Counselor Neeraj Mandhana",  color: "#9F978C" },
          ].map(({ val, color }) => (
            <div key={val} style={{ fontSize: 10, color, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{val}</div>
          ))}
        </div>
      </div>
    </header>
  );
};
export default Masthead;
