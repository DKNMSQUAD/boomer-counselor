export default function TraitSelector({ criteria, selected, onToggle, onClear, matchCount }) {
  return (
    <div style={{ background: '#eee8d9', borderBottom: '2px solid #1a1a1a' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px' }}>
        <div style={{ borderBottom: '1px solid #c8bfa8', padding: '14px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#888', letterSpacing: '0.04em' }}>
            {selected.length === 0
              ? 'Select criteria below to discover matching companies...'
              : selected.length + ' criteri' + (selected.length > 1 ? 'a' : 'on') + ' selected' + (matchCount > 0 ? ' — ' + matchCount + ' compan' + (matchCount > 1 ? 'ies' : 'y') + ' matched' : ' — no matches')}
          </span>
          {selected.length > 0 && (
            <button onClick={onClear} style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono', fontSize: 10, background: 'none', border: '1px solid #c8bfa8', borderRadius: 3, padding: '4px 12px', color: '#666', letterSpacing: '0.08em', cursor: 'pointer' }}>CLEAR ALL</button>
          )}
        </div>
        <div style={{ padding: '16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {criteria.map(t => {
            const active = selected.includes(t.id)
            return (
              <button key={t.id} onClick={() => onToggle(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', border: '1px solid ' + (active ? t.color : '#b5a98a'), borderRadius: 3, background: active ? t.color : 'transparent', color: active ? '#fff' : '#444', fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.12s ease', cursor: 'pointer' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : t.color, display: 'inline-block', flexShrink: 0 }} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
