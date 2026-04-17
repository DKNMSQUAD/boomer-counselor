import { useState, useMemo } from 'react'
import Masthead from './components/Masthead'
import TraitSelector from './components/TraitSelector'
import CompanyGrid from './components/CompanyGrid'
import { useSheetData, getMatches } from './hooks/useSheetData'
import './index.css'

export default function App() {
  const { companies, criteria, loading, error } = useSheetData()
  const [selected, setSelected] = useState([])

  const toggle = id => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const results = useMemo(() => getMatches(companies, selected), [companies, selected])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#eee8d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src='/logo.png' alt='NM Squad' style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: 20, opacity: 0.7 }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loading companies...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#eee8d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#dc2626', letterSpacing: '0.08em', marginBottom: 8 }}>SHEET ERROR</div>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#666', lineHeight: 1.7 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#eee8d9' }}>
      <Masthead totalSelected={selected.length} matchCount={results.length} totalCompanies={companies.length} totalCriteria={criteria.length} />
      <TraitSelector criteria={criteria} selected={selected} onToggle={toggle} onClear={() => setSelected([])} matchCount={results.length} />
      <CompanyGrid companies={companies} criteria={criteria} results={results} selectedCriteria={selected} />
      <footer style={{ borderTop: '1px solid #c8bfa8', padding: '16px 40px', background: '#e8e1d0' }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          NM Squad Profile Builder &middot; Counselor Neeraj Mandhana
        </span>
      </footer>
    </div>
  )
}
