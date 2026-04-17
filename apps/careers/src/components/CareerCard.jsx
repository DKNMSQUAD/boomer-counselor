import { TRAITS, TRAIT_COLORS, CAT_COLORS, CAT_BG } from '../data/careers';

export default function CareerCard({ career, selectedTraits }) {
  const color = CAT_COLORS[career.category] || '#555';
  const bg = CAT_BG[career.category] || '#f9fafb';
  const hasSelected = selectedTraits.length > 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, borderTop: `3px solid ${color}`, transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ background: bg, color, fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 4 }}>
          {career.category}
        </span>
        {hasSelected && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{career.score}%</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#aaa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>match</div>
          </div>
        )}
      </div>
      <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 12, lineHeight: 1.3 }}>{career.major}</h3>
      {hasSelected && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ background: '#f3f4f6', borderRadius: 6, height: 5, overflow: 'hidden' }}>
            <div style={{ background: color, height: '100%', width: career.score + '%', borderRadius: 6, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa', marginTop: 5 }}>
            {career.matchCount} of {selectedTraits.length} trait{selectedTraits.length > 1 ? 's' : ''} matched
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {TRAITS.filter(t => career.traits.includes(t.id)).map(t => {
          const isSelected = selectedTraits.includes(t.id);
          const tc = TRAIT_COLORS[t.id];
          return (
            <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono', fontSize: 10, padding: '3px 9px', borderRadius: 20, border: `1px solid ${isSelected ? tc : '#e5e7eb'}`, background: isSelected ? tc + '18' : '#f9fafb', color: isSelected ? tc : '#999', fontWeight: isSelected ? 700 : 400 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSelected ? tc : '#ddd', display: 'inline-block', flexShrink: 0 }} />
              {t.label}
            </span>
          );
        })}
        {career.traits.length === 0 && <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#ccc' }}>Open to all traits</span>}
      </div>
    </div>
  );
}