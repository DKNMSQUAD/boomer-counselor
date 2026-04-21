import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'

const SHEET_ID = '1m8PPTbx2183hjsqB0X-gLjzWZV3K5BSDFhGUXRYuSXw'
const GID = '0'
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`
const POLL_MS = 60000

// Group configuration - maps criteria index (column D=0, E=1, ...) to semantic groups
// Sheet columns: A=name, B=logo, C=website, then criteria start at D
//   D-F  (idx 0-2)   : I'm looking for    -> Test Prep, Tutor, Counselor
//   G-H  (idx 3-4)   : Size               -> Solo/Small Team, Company
//   I-K  (idx 5-7)   : I prefer            -> In Person, Online, Hybrid
//   L-M  (idx 8-9)   : My budget is        -> Premium, Economy
//   N-S  (idx 10-15) : Based in            -> North India, South India, West India, East India, Middle East, South East Asia
export const GROUPS = [
  { id: 'type',     label: "I'm looking for a",   start: 0,  end: 3  },
  { id: 'size',     label: 'Team size',            start: 3,  end: 5  },
  { id: 'mode',     label: 'I prefer',             start: 5,  end: 8  },
  { id: 'pricing',  label: 'My budget is',         start: 8,  end: 10 },
  { id: 'region',   label: 'They should be in',    start: 10, end: 16 },
]

const GROUP_COLORS = {
  type:    '#2563eb',
  size:    '#0891b2',
  mode:    '#d97706',
  pricing: '#16a34a',
  region:  '#7c3aed',
}

function groupForIndex(i) {
  return GROUPS.find(g => i >= g.start && i < g.end) || null
}

function parseRows(rows) {
  if (!rows || rows.length < 3) return { criteria: [], companies: [] }

  // Row 0 = group headers (repeated), Row 1 = actual labels, Row 2+ = data
  const labelRow = rows[1]
  const criteriaLabels = labelRow.slice(3)
  const criteria = criteriaLabels.map((label, i) => {
    const group = groupForIndex(i)
    return {
      id: `c${i}`,
      label: (label || '').toString().trim(),
      groupId: group ? group.id : null,
      groupLabel: group ? group.label : null,
      color: group ? GROUP_COLORS[group.id] : '#888',
    }
  }).filter(c => c.label !== '')

  const companies = rows.slice(2).map((row, ri) => {
    const name = (row[0] || '').toString().trim()
    if (!name) return null
    const logo = (row[1] || '').toString().trim()
    const website = (row[2] || '').toString().trim()
    const traits = criteria
      .filter((c, i) => (row[3 + i] || '').toString().trim() !== '')
      .map(c => c.id)
    return { id: `provider-${ri}`, name, logo, website, traits }
  }).filter(Boolean)

  return { criteria, companies }
}

export function useSheetData() {
  const [companies, setCompanies] = useState([])
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const fetchSheet = (silent) => {
      const url = BASE_URL + '&_t=' + Date.now()
      Papa.parse(url, {
        download: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const { criteria, companies } = parseRows(result.data)
            if (companies.length === 0) {
              if (!silent) { setError('No data found in sheet'); setLoading(false) }
              return
            }
            setCriteria(criteria)
            setCompanies(companies)
            setLastUpdated(new Date())
            setError(null)
            setLoading(false)
          } catch (e) {
            if (!silent) { setError('Failed to parse sheet data'); setLoading(false) }
          }
        },
        error: () => {
          if (!silent) { setError('Failed to load sheet. Make sure it is published publicly.'); setLoading(false) }
        },
      })
    }
    fetchSheet(false)
    timerRef.current = setInterval(() => fetchSheet(true), POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return { companies, criteria, loading, error, lastUpdated }
}

export function getMatches(companies, selectedCriteria, criteria) {
  if (!selectedCriteria.length) return []

  const selectedByGroup = {}
  for (const id of selectedCriteria) {
    const crit = criteria.find(c => c.id === id)
    if (!crit || !crit.groupId) continue
    if (!selectedByGroup[crit.groupId]) selectedByGroup[crit.groupId] = []
    selectedByGroup[crit.groupId].push(id)
  }
  const groupsWithSelection = Object.entries(selectedByGroup)

  return companies
    .filter(company => groupsWithSelection.every(([_gid, picks]) =>
      picks.some(pid => company.traits.includes(pid))
    ))
    .map(company => {
      const matchCount = selectedCriteria.filter(t => company.traits.includes(t)).length
      const score = Math.round((matchCount / selectedCriteria.length) * 100)
      return { ...company, matchCount, score }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export function groupByScore(matches) {
  const bands = [
    { label: 'Strong Match',  min: 80,  max: 100, color: '#16a34a' },
    { label: 'Good Match',    min: 50,  max: 79,  color: '#d97706' },
    { label: 'Partial Match', min: 1,   max: 49,  color: '#6b7280' },
  ]
  return bands
    .map(band => ({ ...band, items: matches.filter(c => c.score >= band.min && c.score <= band.max) }))
    .filter(band => band.items.length > 0)
}
