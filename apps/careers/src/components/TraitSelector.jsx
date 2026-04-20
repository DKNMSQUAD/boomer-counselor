import { TRAITS, TRAIT_COLORS } from '../data/careers';

export default function TraitSelector({ selected, onToggle, onClear, matchCount }) {
  const statusText = selected.length === 0
    ? 'Pick traits in any category to find matching careers'
    : `${selected.length} trait${selected.length > 1 ? 's' : ''} selected${typeof matchCount === 'number' ? (matchCount > 0 ? ` — ${matchCount} match${matchCount > 1 ? 'es' : ''}` : ' — no matches') : ''}`;

  return (
    <div className="bc-filters">
      <div className="bc-filters-inner">
        <div className="bc-filters-status">
          <span className="bc-filters-statusText">{statusText}</span>
          {selected.length > 0 && (
            <button onClick={onClear} className="bc-filters-clear">CLEAR ALL</button>
          )}
        </div>

        <div className="bc-filters-group">
          <div className="bc-filters-grouplabel">Your traits</div>
          <div className="bc-filters-pills">
            {TRAITS.map(t => {
              const active = selected.includes(t.id);
              const color = TRAIT_COLORS[t.id] || '#555';
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={'bc-filter-pill' + (active ? ' is-active' : '')}
                  style={active
                    ? { background: color, borderColor: color, color: '#fff' }
                    : { borderColor: color + '66' }}
                >
                  <span className="bc-filter-dot" style={{ background: active ? 'rgba(255,255,255,0.85)' : color }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
