import { useState, useEffect } from 'react'
import Papa from 'papaparse'

const SHEET_ID = '1vkYtslNapoUNErsGmCcAo0j8sAeNSGebcrLhq2aJLf8'
const GID = '357056057'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`

export function useSheetData() {
  const [companies, setCompanies] = useState([])
  const [criteria, setCriteria] = useState([])  // [{ id, label, color }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const COLORS = [
      '#7c3aed','#2563eb','#d97706','#0891b2','#059669',
      '#db2777','#ea580c','#65a30d','#6d28d9','#dc2626',
      '#0284c7','#16a34a','#92400e','#1d4ed8','#be185d',
    ]

    Papa.parse(CSV_URL, {
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data
          if (!rows || rows.length < 2) { setError('No data found in sheet'); setLoading(false); return }

          // Row 0 = headers
          const headers = rows[0]
          // Col A=0: name, Col B=1: logo, Col C=2: website, Col D-R=3+: criteria
          const criteriaHeaders = headers.slice(3)
          const parsedCriteria = criteriaHeaders.map((label, i) => ({
            id: `c${i}`,
            label: (label || '').toString().trim(),
            color: COLORS[i % COLORS.length],
          })).filter(c => c.label !== '')

          // Data rows
          const parsedCompanies = rows.slice(1).map((row, ri) => {
            const name = (row[0] || '').toString().trim()
            if (!name) return null
            const logo = (row[1] || '').toString().trim()
            const website = (row[2] || '').toString().trim()
            const traits = parsedCriteria
              .filter((c, i) => {
                const val = (row[3 + i] || '').toString().trim()
                // Sheet puts column-name as cell value when criterion applies, empty when it doesn't
                return val !== ''
              })
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

export function getMatches(companies, selectedCriteria) {
  if (selectedCriteria.length === 0) return []
  return companies
    .filter(c => c.traits.length > 0)
    .map(c => {
      const matchCount = selectedCriteria.filter(t => c.traits.includes(t)).length
      const score = Math.round((matchCount / c.traits.length) * 100)
      return { ...c, matchCount, score }
    })
    .filter(c => c.matchCount > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

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