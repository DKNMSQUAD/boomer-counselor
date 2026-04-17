import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'

const SHEET_ID = '1vkYtslNapoUNErsGmCcAo0j8sAeNSGebcrLhq2aJLf8'
const GID = '357056057'
// Base URL without cache-buster; cache-buster is appended per-fetch so browser/CDN can't serve stale data
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`
const POLL_MS = 60000  // Re-fetch every 60 seconds while the page is open

// Group configuration - maps criteria index (column D=0, E=1, ...) to semantic groups
// Sheet columns: A=name, B=logo, C=website, then criteria start at D
//   D-F  (idx 0-2)   : I am             -> Middle School, High School, Gap Year
//   G-M  (idx 3-9)   : I am interested in -> STEM, Humanities, Business, Design, Law, Medicine, Other
//   N-S  (idx 10-15) : I am looking for   -> Skill Building, Structured Program, Competition, Research/Project, Summer School, Other
//   T-V  (idx 16-18) : Location preference -> Online, India, Global
export const GROUPS = [
  { id: 'stage',    label: 'I am',                 start: 0,  end: 3  },
  { id: 'interest', label: 'I am interested in',   start: 3,  end: 10 },
  { id: 'format',   label: 'I am looking for',     start: 10, end: 16 },
  { id: 'location', label: 'Location preference',  start: 16, end: 19 },
]

const GROUP_COLORS = {
  stage:    '#2563eb',
  interest: '#d97706',
  format:   '#16a34a',
  location: '#7c3aed',
}

function groupForIndex(i) {
  return GROUPS.find(g => i >= g.start && i < g.end) || null
}

function parseRows(rows) {
  if (!rows || rows.length < 2) return { criteria: [], companies: [] }

  const headers = rows[0]
  const criteriaHeaders = headers.slice(3)
  const criteria = criteriaHeaders.map((label, i) => {
    const group = groupForIndex(i)
    return {
      id: `c${i}`,
      label: (label || '').toString().trim(),
      groupId: group ? group.id : null,
      groupLabel: group ? group.label : null,
      color: group ? GROUP_COLORS[group.id] : '#888',
    }
  }).filter(c => c.label !== '')

  const companies = rows.slice(1).map((row, ri) => {
    const name = (row[0] || '').toString().trim()
    if (!name) return null
    const logo = (row[1] || '').toString().trim()
    const website = (row[2] || '').toString().trim()
    const traits = criteria
      .filter((c, i) => (row[3 + i] || '').toString().trim() !== '')
      .map(c => c.id)
    return { id: `company-${ri}`, name, logo, website, traits }
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
      // cache-bust with timestamp so browsers/CDNs can't serve stale content
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

    // Initial fetch (with loading spinner)
    fetchSheet(false)

    // Then poll silently every POLL_MS
    timerRef.current = setInterval(() => fetchSheet(true), POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return { companies, criteria, loading, error, lastUpdated }
}

// Matching: AND across groups, OR within groups, empty groups ignored
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
