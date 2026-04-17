export default function Masthead({ matchCount, totalSelected }) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <header style={{ background: '#111', color: '#fff', borderBottom: '4px solid #F5C842' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ borderBottom: '1px solid #2a2a2a', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{today}</span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Boomer Counselor</span>
        </div>
        <div style={{ padding: '22px 0 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
            <img src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' style={{ width: 52, height: 52, borderRadius: '50%' }} />
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
              Career Discovery
            </h1>
          </div>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Select your traits &mdash; Discover your path
          </p>
        </div>
        <div style={{ borderTop: '1px solid #2a2a2a', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#F5C842', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {totalSelected === 0 ? 'No traits selected' : `${totalSelected} trait${totalSelected > 1 ? 's' : ''} selected`}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {totalSelected === 0 ? '25 careers available' : matchCount > 0 ? `${matchCount} career${matchCount > 1 ? 's' : ''} matched` : 'No matches'}
          </span>
        </div>
      </div>
    </header>
  );
}