import { GROUPS } from '../hooks/useSheetData'

export default function TraitSelector({ criteria, selected, onToggle, onClear, matchCount }) {
  const groupedCriteria = GROUPS.map(g => ({
    ...g,
    items: criteria.filter(c => c.groupId === g.id),
  })).filter(g => g.items.length > 0)

  const statusText = selected.length === 0
    ? 'Pick filters in any category to find matching activities'
    : `${selected.length} filter${selected.length > 1 ? 's' : ''} selected${matchCount > 0 ? ` — ${matchCount} match${matchCount > 1 ? 'es' : ''}` : ' — no matches'}`

  return (
    <div className="bc-filters">
      <div className="bc-filters-inner">
        <div className="bc-filters-status">
          <span className="bc-filters-statusText">{statusText}</span>
          {selected.length > 0 && (
            <button onClick={onClear} className="bc-filters-clear">CLEAR ALL</button>
          )}
        </div>

        {groupedCriteria.map(g => (
          <div key={g.id} className="bc-filters-group">
            <div className="bc-filters-grouplabel">{g.label}</div>
            <div className="bc-filters-pills">
              {g.items.map(t => {
                const active = selected.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => onToggle(t.id)}
                    className={'bc-filter-pill' + (active ? ' is-active' : '')}
                    style={active
                      ? { background: t.color, borderColor: t.color, color: '#fff' }
                      : { borderColor: t.color + '66' }}
                  >
                    <span className="bc-filter-dot" style={{ background: active ? 'rgba(255,255,255,0.85)' : t.color }} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
