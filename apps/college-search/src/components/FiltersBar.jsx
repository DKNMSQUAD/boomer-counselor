import { MAJOR_LABELS } from "../hooks/useGoogleSheet";

const REGIONS   = ["USA", "UK", "India", "Asia", "Europe", "Canada", "Middle East", "Australia & NZ", "Rest of World"];
const LOCATIONS = ["Big City", "Small City", "Countryside"];
const SIZES     = ["Small", "Medium", "Large"];
const CHANCES   = ["Selective", "Achievable"];

const GROUPS = [
  { id: "major",    label: "Major / subject",  items: MAJOR_LABELS },
  { id: "region",   label: "Region",           items: REGIONS },
  { id: "location", label: "Location",         items: LOCATIONS },
  { id: "size",     label: "School size",      items: SIZES },
  { id: "chance",   label: "Admission chance", items: CHANCES },
];

const chanceColors = { Selective: "#c0392b", Achievable: "#27ae60" };

const FiltersBar = ({ search, setSearch, filters, setFilters }) => {
  const toggleF = (k, v) => setFilters((p) => {
    const arr = p[k] || [];
    return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const clearAll = () => {
    setFilters({ major: [], region: [], location: [], size: [], chance: [] });
    if (setSearch) setSearch("");
  };

  const total = Object.values(filters).reduce((sum, a) => sum + (a ? a.length : 0), 0);
  const hasActive = total > 0 || (search && search.trim().length > 0);

  const statusText = hasActive
    ? `${total} filter${total !== 1 ? "s" : ""} selected`
    : "Pick filters in any category to find matching colleges";

  return (
    <div className="bc-filters">
      <div className="bc-filters-inner">
        <div className="bc-filters-status">
          {setSearch !== undefined && (
            <div className="bc-filters-search">
              <span className="bc-search-icon">&#x2315;</span>
              <input
                type="text"
                placeholder="Search colleges, regions, majors..."
                value={search || ""}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {setSearch === undefined && (
            <span className="bc-filters-statusText">{statusText}</span>
          )}
          {hasActive && (
            <button onClick={clearAll} className="bc-filters-clear">Clear all</button>
          )}
        </div>

        {GROUPS.map((g) => (
          <div key={g.id} className="bc-filters-group">
            <div className="bc-filters-grouplabel">{g.label}</div>
            <div className="bc-filters-pills">
              {g.items.map((v) => {
                const active = (filters[g.id] || []).includes(v);
                const color = g.id === "chance" ? chanceColors[v] : "#1a1a1a";
                return (
                  <button
                    key={v}
                    onClick={() => toggleF(g.id, v)}
                    className={"bc-filter-pill" + (active ? " is-active" : "")}
                    style={active
                      ? { background: color, borderColor: color, color: "#fff" }
                      : { borderColor: "#c8bfa8" }}
                  >
                    <span className="bc-filter-dot" style={{ background: active ? "rgba(255,255,255,0.85)" : color }} />
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FiltersBar;
