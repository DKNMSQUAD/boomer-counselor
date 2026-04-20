import { TRAITS, TRAIT_COLORS, CAT_COLORS } from '../data/careers';

export default function CareerCard({ career, selectedTraits }) {
  const color = CAT_COLORS[career.category] || '#555';
  const hasSelected = selectedTraits.length > 0;
  const careerTraits = TRAITS.filter(t => career.traits.includes(t.id));

  return (
    <div className="bc-card" style={{ borderLeftColor: color }}>
      <div className="bc-card-top">
        <div className="bc-card-logo">
          <span className="bc-card-logo-fallback" style={{ color }}>
            {career.major.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="bc-card-heading">
          <h3 className="bc-card-title">{career.major}</h3>
          <div className="bc-card-subtitle">{career.category}</div>
        </div>
        {hasSelected && (
          <span className="bc-card-badge" style={{ color, borderColor: color }}>
            {career.score}% match
          </span>
        )}
      </div>

      {hasSelected && (
        <>
          <div className="bc-card-progress">
            <div className="bc-card-progress-fill" style={{ width: career.score + '%', background: color }} />
          </div>
          <div className="bc-card-meta">
            {career.matchCount} of {career.traits.length} trait{career.traits.length !== 1 ? 's' : ''} matched
          </div>
        </>
      )}

      <div className="bc-card-pills">
        {careerTraits.map(t => {
          const isOn = selectedTraits.includes(t.id);
          const tc = TRAIT_COLORS[t.id];
          return (
            <span
              key={t.id}
              className={'bc-card-pill' + (isOn ? ' is-on' : '')}
              style={isOn ? { borderColor: tc, color: tc, background: tc + '15' } : undefined}
            >
              <span className="bc-card-pill-dot" style={{ background: isOn ? tc : '#c8bfa8' }} />
              {t.label}
            </span>
          );
        })}
        {careerTraits.length === 0 && (
          <span className="bc-empty">OPEN TO ALL TRAITS</span>
        )}
      </div>
    </div>
  );
}
