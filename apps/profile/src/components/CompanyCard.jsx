export default function CompanyCard({ company, criteria, selectedCriteria }) {
  const hasSelected = selectedCriteria.length > 0
  const matchedCriteria = criteria.filter(t => company.traits.includes(t.id) && selectedCriteria.includes(t.id))
  const otherCriteria = criteria.filter(t => company.traits.includes(t.id) && !selectedCriteria.includes(t.id))
  const hasWebsite = company.website && company.website.toLowerCase() !== 'no website' && company.website !== ''
  const scoreColor = company.score >= 80 ? '#16a34a' : company.score >= 50 ? '#d97706' : '#6b7280'

  const cardStyle = {
    background: '#fff', border: '1px solid #d9d0c0', borderRadius: 2,
    padding: '18px 20px 16px', transition: 'box-shadow 0.15s',
    cursor: hasWebsite ? 'pointer' : 'default',
    textDecoration: 'none', display: 'block', color: 'inherit',
  }

  const inner = (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {company.logo && company.logo !== '' ? (
          <img src={company.logo} alt={company.name}
            style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 4, border: '1px solid #e8e0ce', flexShrink: 0, background: '#fafaf8' }}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 4, border: '1px solid #e8e0ce', flexShrink: 0, background: '#f0ece4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 700, color: '#b5a98a' }}>
              {company.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>{company.name}</h3>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
        {matchedCriteria.map(t => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, border: '1px solid ' + t.color, background: t.color + '18', color: t.color }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
            {t.label}
          </span>
        ))}
        {otherCriteria.map(t => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, border: '1px solid #c8bfa8', background: 'transparent', color: '#aaa' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8bfa8', display: 'inline-block', flexShrink: 0 }} />
            {t.label}
          </span>
        ))}
        {company.traits.length === 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#bbb', letterSpacing: '0.06em' }}>OPEN TO ALL PROFILES</span>
        )}
      </div>
    </div>
  )

  if (hasWebsite) {
    return (
      <a href={company.website} target="_blank" rel="noopener noreferrer" style={cardStyle}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
        {inner}
      </a>
    )
  }
  return (
    <div style={cardStyle}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      {inner}
    </div>
  )
}
