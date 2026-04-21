import { emitEvent } from '../bcEvents'

export default function CompanyCard({ company, criteria, selectedCriteria }) {
  const hasSelected = selectedCriteria.length > 0
  const matched = criteria.filter(t => company.traits.includes(t.id) && selectedCriteria.includes(t.id))
  const other   = criteria.filter(t => company.traits.includes(t.id) && !selectedCriteria.includes(t.id))
  const hasWebsite = company.website && company.website.toLowerCase() !== 'no website' && company.website !== ''
  const scoreColor = typeof company.score === 'number'
    ? (company.score >= 80 ? '#16a34a' : company.score >= 50 ? '#d97706' : '#6b7280')
    : '#6b7280'

  const handleClick = () => {
    if (!hasWebsite) return
    emitEvent('link_click', {
      action: 'open',
      targetId: company.id,
      targetLabel: company.name,
      extraData: { company_name: company.name, company_url: company.website, had_filters: hasSelected },
    })
  }

  const inner = (
    <>
      <div className="bc-card-top">
        <div className="bc-card-logo">
          {company.logo && company.logo !== '' ? (
            <img src={company.logo} alt={company.name} onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <span className="bc-card-logo-fallback">{company.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="bc-card-heading">
          <h3 className="bc-card-title">{company.name}</h3>
          {company.category && <div className="bc-card-subtitle">{company.category}</div>}
        </div>
        {hasSelected && typeof company.score === 'number' && (
          <span className="bc-card-badge" style={{ color: scoreColor, borderColor: scoreColor }}>
            {company.score}% match
          </span>
        )}
      </div>

      <div className="bc-card-pills">
        {matched.map(t => (
          <span key={t.id} className="bc-card-pill is-on"
            style={{ borderColor: t.color, color: t.color, background: t.color + '18' }}>
            <span className="bc-card-pill-dot" style={{ background: t.color }} />
            {t.label}
          </span>
        ))}
        {other.map(t => (
          <span key={t.id} className="bc-card-pill">
            <span className="bc-card-pill-dot" />
            {t.label}
          </span>
        ))}
        {company.traits.length === 0 && <span className="bc-empty">OPEN TO ALL PROFILES</span>}
      </div>
    </>
  )

  if (hasWebsite) {
    return (
      <a href={company.website} target="_blank" rel="noopener noreferrer"
         onClick={handleClick} className="bc-card" style={{ borderLeftColor: scoreColor }}>
        {inner}
      </a>
    )
  }
  return (
    <div className="bc-card" style={{ borderLeftColor: '#c8bfa8' }}>
      {inner}
    </div>
  )
}
