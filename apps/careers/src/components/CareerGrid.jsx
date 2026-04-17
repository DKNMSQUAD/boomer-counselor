import CareerCard from './CareerCard';
import { CAREERS, CATEGORIES, CAT_COLORS } from '../data/careers';

export default function CareerGrid({ results, selectedTraits }) {
  const noSelection = selectedTraits.length === 0;

  if (!noSelection && results.length === 0) {
    return (
      <div style={{ maxWidth: 1140, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e5e7eb' }} />
        </div>
        <h2 style={{ fontFamily: 'Playfair Display', fontSize: 22, color: '#111', marginBottom: 8 }}>No matches found</h2>
        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#999' }}>Try removing a trait to broaden your results.</p>
      </div>
    );
  }

  if (noSelection) {
    return (
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 22, color: '#111', marginBottom: 4 }}>All Career Paths</h2>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#999' }}>Select traits above to filter and score matches</p>
        </div>
        {CATEGORIES.map(cat => {
          const items = CAREERS.filter(c => c.category === cat);
          const color = CAT_COLORS[cat];
          return (
            <div key={cat} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid ' + color }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{cat}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa' }}>{items.length} careers</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
                {items.map(c => <CareerCard key={c.major} career={c} selectedTraits={[]} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = results.filter(c => c.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Playfair Display', fontSize: 22, color: '#111', marginBottom: 4 }}>
          {results.length} Career{results.length > 1 ? 's' : ''} Matched
        </h2>
        <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#999' }}>Sorted by match score, highest first</p>
      </div>
      {Object.entries(grouped).map(([cat, items]) => {
        const color = CAT_COLORS[cat];
        return (
          <div key={cat} style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid ' + color }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{cat}</span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa' }}>{items.length} match{items.length > 1 ? 'es' : ''}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
              {items.map(c => <CareerCard key={c.major} career={c} selectedTraits={selectedTraits} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}