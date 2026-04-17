import { TRAITS, TRAIT_COLORS, CAT_COLORS } from '../data/careers';

export default function CareerCard({ career, selectedTraits }) {
  const color = CAT_COLORS[career.category] || '#555';
  const hasSelected = selectedTraits.length > 0;

  // Traits this career has - split into matched (user also selected) and other
  const careerTraits = TRAITS.filter(t => career.traits.includes(t.id));

  return (
    <div
      className="bc-career-card"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Title + match badge row */}
      <div className="bc-career-head">
        <h3 className="bc-career-title">{career.major}</h3>
        {hasSelected && (
          <span
            className="bc-match-badge"
            style={{ borderColor: color, color }}
          >
            {career.score}% MATCH
          </span>
        )}
      </div>

      {/* Progress bar */}
      {hasSelected && (
        <>
          <div className="bc-progress">
            <div
              className="bc-progress-fill"
              style={{ width: career.score + '%', background: color }}
            />
          </div>
          <div className="bc-match-detail">
            {career.matchCount} of {career.traits.length} trait{career.traits.length !== 1 ? 's' : ''} matched
          </div>
        </>
      )}

      {/* Trait pills */}
      <div className="bc-traits">
        {careerTraits.map(t => {
          const isSelected = selectedTraits.includes(t.id);
          const tc = TRAIT_COLORS[t.id];
          return (
            <span
              key={t.id}
              className={`bc-trait${isSelected ? ' is-on' : ''}`}
              style={isSelected
                ? { borderColor: tc, color: tc, background: tc + '15' }
                : { borderColor: '#d5d5d5', color: '#999', background: 'transparent' }
              }
            >
              <span
                className="bc-trait-dot"
                style={{ background: isSelected ? tc : '#ccc' }}
              />
              {t.label.toUpperCase()}
            </span>
          );
        })}
        {careerTraits.length === 0 && (
          <span className="bc-trait-empty">Open to all traits</span>
        )}
      </div>
    </div>
  );
}
