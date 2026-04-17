export default function Masthead({ totalSelected, matchCount, totalCompanies, totalCriteria }) {
  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '2.5px solid #1a1a1a',
      padding: '28px 40px 22px',
      fontFamily: "'Mulish', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0, flex: 1 }}>
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' style={{ width: 70, height: 70, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Mulish', system-ui, sans-serif",
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              color: '#1a1a1a',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              margin: 0,
            }}>
              Profile Builder
            </h1>
            <div style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 'clamp(18px, 2.2vw, 24px)',
              fontWeight: 700,
              color: '#FDB515',
              lineHeight: 1,
              marginTop: 4,
            }}>
              Build your story.
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {[
            `${totalCompanies} Companies`,
            `${totalCriteria} Criteria`,
          ].map(s => (
            <div key={s} style={{
              fontFamily: "'Mulish', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#666',
              lineHeight: 2,
              textTransform: 'uppercase',
            }}>{s}</div>
          ))}
        </div>
      </div>
    </header>
  );
}
