import CompanyCard from './CompanyCard'

export default function CompanyGrid({ companies, criteria, results, selectedCriteria, onPreview, activeCompanyId }) {
  const noSelection = selectedCriteria.length === 0

  if (!noSelection && results.length === 0) {
    return (
      <div style={{ maxWidth: 1400, margin: '60px auto', padding: '0 40px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, color: '#1a1a1a', marginBottom: 8 }}>No matches found</h2>
        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#888', letterSpacing: '0.06em' }}>TRY REMOVING A CRITERION TO BROADEN YOUR RESULTS</p>
      </div>
    )
  }

  const displayList = noSelection ? companies : results

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 24, borderBottom: '1px solid #c8bfa8', paddingBottom: 12 }}>
        <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 800, color: '#1a1a1a' }}>
          {noSelection ? 'All Activities' : 'Matched Activities'}
        </h2>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#888', letterSpacing: '0.1em', fontWeight: 600 }}>
          {displayList.length} {noSelection ? 'AVAILABLE' : 'RESULTS'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {displayList.map(c => (
          <CompanyCard
            key={c.id}
            company={c}
            criteria={criteria}
            selectedCriteria={selectedCriteria}
            onPreview={onPreview}
            isActive={activeCompanyId === c.id}
          />
        ))}
      </div>
    </div>
  )
}
