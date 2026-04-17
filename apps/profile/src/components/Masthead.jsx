export default function Masthead({ totalSelected, matchCount, totalCompanies, totalCriteria }) {
  return (
    <header style={{ background: '#eee8d9', borderBottom: '2px solid #1a1a1a', padding: '28px 40px 22px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src='/logo.png' alt='NM Squad' style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 52, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Profile Builder
            </h1>
            <p style={{ fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 700, fontStyle: 'italic', color: '#8B1A1A', marginTop: 2 }}>
              By NM Squad
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', paddingTop: 6 }}>
          {[
            `${totalCompanies} COMPANIES`,
            `${totalCriteria} CRITERIA`,
            'COUNSELOR NEERAJ MANDHANA'
          ].map(s => (
            <div key={s} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#555', lineHeight: 2, textTransform: 'uppercase' }}>{s}</div>
          ))}
        </div>
      </div>
    </header>
  )
}