import { useState, useEffect, useRef } from "react";

const SHEET_ID = "1Pb7Uin9Oc1omLM2kXhdisZuqV84PCMqdhRlQjNBSYlc";
const CSV_URL  = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv";
const POLL_MS  = 60000;

export const MAJOR_COLS = [
  { col: "Arch.",  label: "Architecture" },
  { col: "Biz.",   label: "Business" },
  { col: "CS/DS",  label: "CS / Data Science" },
  { col: "Design", label: "Design" },
  { col: "Eco",    label: "Economics" },
  { col: "Engg",   label: "Engineering" },
  { col: "Film",   label: "Film" },
  { col: "Hosp.",  label: "Hospitality" },
  { col: "Law",    label: "Law" },
  { col: "Med",    label: "Medicine" },
  { col: "Music",  label: "Music" },
  { col: "Psy",    label: "Psychology" },
  { col: "PCBM",   label: "PCBM" },
];

export const MAJOR_LABELS = MAJOR_COLS.map((m) => m.label);

function parseCSVLine(line) {
  const fields = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.split("\n").map(function(l) { return l.replace(/\r$/, ""); });
  return lines.filter(function(l) { return l.trim().length > 0; }).map(parseCSVLine);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normaliseSize(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s === "big") return "Large";
  if (s === "small" || s === "smal" || s === "smll") return "Small";
  if (s === "medium") return "Medium";
  return raw || "Medium";
}

function rowToCollege(headers, row) {
  function get(col) {
    const i = headers.findIndex(function(h) { return h.trim() === col; });
    return i >= 0 ? (row[i] || "").trim() : "";
  }
  const name = get("College");
  if (!name) return null;

  const majors = MAJOR_COLS
    .filter(function(m) { return get(m.col).toLowerCase() === "yes"; })
    .map(function(m) { return m.label; });

  return {
    id: slugify(name),
    name: name,
    logo: get("College Logos") || null,
    region: get("Region") || "Other",
    location: get("Location") || "",
    size: normaliseSize(get("Size")),
    chance: get("Chance") || "",
    reportUrl: get("Report") || null,
    majors: majors,
    price: 299,
  };
}

export function useGoogleSheet() {
  const [colleges,    setColleges]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timer = useRef(null);

  async function fetchSheet(quiet) {
    if (!quiet) setLoading(true);
    try {
      const res  = await fetch(CSV_URL + "&_=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("Sheet appears empty");
      const headers = rows[0];
      const parsed  = rows.slice(1).map(function(r) { return rowToCollege(headers, r); }).filter(Boolean).filter(function(c) { return c.logo && c.logo.trim().length > 0; });
      setColleges(parsed);
      setLastUpdated(new Date());
      setError(null);
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    fetchSheet(false);
    timer.current = setInterval(function() { fetchSheet(true); }, POLL_MS);
    return function() { clearInterval(timer.current); };
  }, []);

  return { colleges: colleges, loading: loading, error: error, lastUpdated: lastUpdated };
}
