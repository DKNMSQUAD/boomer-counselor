import { useState } from "react";

const chanceColors = {
  Selective:  "#c0392b",
  Achievable: "#27ae60",
};

const CollegeCard = ({ college, isShortlisted, onViewReport, onToggleShortlist }) => {
  const [logoErr, setLogoErr] = useState(false);
  const accent = chanceColors[college.chance] || "#c8bfa8";
  const hasReport = !!college.reportUrl;

  return (
    <div className="bc-card" style={{ borderLeftColor: accent }}>
      <div className="bc-card-top">
        <div className="bc-card-logo">
          {!logoErr && college.logo ? (
            <img src={college.logo} alt={college.name} onError={() => setLogoErr(true)} />
          ) : (
            <span className="bc-card-logo-fallback">{college.name.charAt(0)}</span>
          )}
        </div>
        <div className="bc-card-heading">
          <h3 className="bc-card-title">{college.name}</h3>
          <div className="bc-card-subtitle">
            {[college.location, college.region].filter(Boolean).join(" \u00b7 ")}
          </div>
        </div>
        {college.chance && (
          <span className="bc-card-badge" style={{ color: accent, borderColor: accent }}>
            {college.chance}
          </span>
        )}
      </div>

      {college.majors && college.majors.length > 0 && (
        <div className="bc-card-pills">
          {college.size && (
            <span className="bc-card-pill">
              <span className="bc-card-pill-dot" />
              {college.size}
            </span>
          )}
          {college.majors.slice(0, 4).map((m) => (
            <span key={m} className="bc-card-pill">
              <span className="bc-card-pill-dot" />
              {m}
            </span>
          ))}
          {college.majors.length > 4 && (
            <span className="bc-card-pill">
              <span className="bc-card-pill-dot" />
              +{college.majors.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="bc-card-footer">
        <button
          onClick={() => onToggleShortlist(college.id)}
          className={"bc-card-btn" + (isShortlisted ? " is-on" : "")}
        >
          {isShortlisted ? "\u2665 Shortlisted" : "\u2661 Shortlist"}
        </button>
        {hasReport && (
          <button onClick={() => onViewReport(college)} className="bc-card-btn is-primary">
            View report
          </button>
        )}
      </div>
    </div>
  );
};

export default CollegeCard;
