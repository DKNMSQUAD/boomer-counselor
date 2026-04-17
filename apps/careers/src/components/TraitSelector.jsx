import { TRAITS, TRAIT_COLORS } from '../data/careers';

export default function TraitSelector({ selected, onToggle, onClear }) {
  return (
    <section style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '22px 24px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Your Traits</span>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#999', marginLeft: 12 }}>Pick any combination to find matching careers</span>
          </div>
          {selected.length > 0 && (
            <button onClick={onClear} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 14px', color: '#555' }}>
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {TRAITS.map(t => {
            const active = selected.includes(t.id);
            const color = TRAIT_COLORS[t.id] || '#555';
            return (
              <button key={t.id} onClick={() => onToggle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 50, border: `2px solid ${active ? color : '#e5e7eb'}`, background: active ? color : '#fff', color: active ? '#fff' : '#444', fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, transition: 'all 0.15s ease', boxShadow: active ? `0 2px 10px ${color}40` : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.75)' : color, flexShrink: 0, display: 'inline-block' }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}