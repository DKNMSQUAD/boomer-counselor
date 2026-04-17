import { useState, useEffect } from 'react'
import Papa from 'papaparse'

const SHEET_ID = '1vkYtslNapoUNErsGmCcAo0j8sAeNSGebcrLhq2aJLf8'
const GID = '357056057'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`

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

// Assign a stable distinct color per group (all criteria within a group share the color tone)
const GROUP_COLORS = {
  stage:    '#2563eb',  // blue
  interest: '#d97706',  // orange
  format:   '#16a34a',  // green
  location: '#7c3aed',  // purple
}

function groupForIndex(i) {
  return GROUPS.find(g => i >= g.start && i < g.end) || null
}

export function useSheetData() {
  const [companies, setCompanies] = useState([])
  const [criteria, setCriteria] = useState([])   // [{ id, label, color, groupId, groupLabel }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data
          if (!rows || rows.length < 2) { setError('No data found in sheet'); setLoading(false); return }

          // Row 0 = headers. Col A=0 name, B=1 logo, C=2 website, D+ = criteria
          const headers = rows[0]
          const criteriaHeaders = headers.slice(3)
          const parsedCriteria = criteriaHeaders.map((label, i) => {
            const group = groupForIndex(i)
            return {
              id: `c${i}`,
              label: (label || '').toString().trim(),
              groupId: group ? group.id : null,
              groupLabel: group ? group.label : null,
              color: group ? GROUP_COLORS[group.id] : '#888',
            }
          }).filter(c => c.label !== '')

          // Data rows
          const parsedCompanies = rows.slice(1).map((row, ri) => {
            const name = (row[0] || '').toString().trim()
            if (!name) return null
            const logo = (row[1] || '').toString().trim()
            const website = (row[2] || '').toString().trim()
            // Cell is non-empty when the criterion applies (sheet puts column header name as value)
            const traits = parsedCriteria
              .filter((c, i) => (row[3 + i] || '').toString().trim() !== '')
              .map(c => c.id)
            return { id: `company-${ri}`, name, logo, website, traits }
          }).filter(Boolean)

          setCriteria(parsedCriteria)
          setCompanies(parsedCompanies)
          setLoading(false)
        } catch (e) {
          setError('Failed to parse sheet data')
          setLoading(false)
        }
      },
      error: () => { setError('Failed to load sheet. Make sure it is published publicly.'); setLoading(false) }
    })
  }, [])

  return { companies, criteria, loading, error }
}

// Matching logic:
//   - AND across groups (a group with any selection must have at least one match in the company's traits)
//   - OR within a group (any of the selected criteria in that group satisfies the group)
//   - Groups with zero selections are ignored (treated as "any")
// Score: fraction of the user's total selections that the company has, as a percentage.
export function getMatches(companies, selectedCriteria, criteria) {
  if (!selectedCriteria.length) return []

  // Group selections by groupId
  const selectedByGroup = {}
  for (const id of selectedCriteria) {
    const crit = criteria.find(c => c.id === id)
    if (!crit || !crit.groupId) continue
    if (!selectedByGroup[crit.groupId]) selectedByGroup[crit.groupId] = []
    selectedByGroup[crit.groupId].push(id)
  }
  const groupsWithSelection = Object.entries(selectedByGroup)

  return companies
    .filter(company => {
      // Every group that has selections must have at least one matching trait on the company
      return groupsWithSelection.every(([_gid, picks]) =>
        picks.some(pid => company.traits.includes(pid))
      )
    })
    .map(company => {
      const matchCount = selectedCriteria.filter(t => company.traits.includes(t)).length
      const score = Math.round((matchCount / selectedCriteria.length) * 100)
      return { ...company, matchCount, score }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

// Unused for now but kept in case grouped-by-score rendering is wanted later
export function groupByScore(matches) {
  const bands = [
    { label: 'Strong Match',  min: 80,  max: 100, color: '#16a34a' },
    { label: 'Good Match',    min: 50,  max: 79,  color: '#d97706' },
    { label: 'Partial Match', min: 1,   max: 49,  color: '#6b7280' },
  ]
  return bands
    .map(band => ({
      ...band,
      items: matches.filter(c => c.score >= band.min && c.score <= band.max),
    }))
    .filter(band => band.items.length > 0)
}
