import './careers.css';
import CareerCard from './CareerCard';
import { CAREERS, CATEGORIES, CAT_COLORS } from '../data/careers';

const BANDS = [
  { key: 'strong',  label: 'Strong Match',  range: '80-100%',  min: 80,  max: 100, dot: '#16a34a' },
  { key: 'good',    label: 'Good Match',    range: '50-79%',   min: 50,  max: 79,  dot: '#d97706' },
  { key: 'partial', label: 'Partial Match', range: 'below 50%', min: 1,  max: 49,  dot: '#6b7280' },
];

export default function CareerGrid({ results, selectedTraits }) {
  const noSelection = selectedTraits.length === 0;

  // No traits selected: show all careers grouped by academic category (browse mode)
  if (noSelection) {
    return (
      <div className="bc-careers-wrap">
        <div className="bc-section-header">
          <h2 className="bc-section-title">All Career Paths</h2>
          <span className="bc-section-hint">Select traits above to filter and score matches</span>
        </div>
        {CATEGORIES.map(cat => {
          const items = CAREERS.filter(c => c.category === cat);
          const color = CAT_COLORS[cat];
          return (
            <div key={cat} className="bc-band">
              <div className="bc-band-header" style={{ borderBottom: `2px solid ${color}` }}>
                <span className="bc-band-dot" style={{ background: color }} />
                <span className="bc-band-label" style={{ color }}>{cat}</span>
                <span className="bc-band-count">{items.length} career{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bc-cards-grid">
                {items.map(c => <CareerCard key={c.major} career={c} selectedTraits={[]} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // No matches
  if (results.length === 0) {
    return (
      <div className="bc-careers-wrap bc-empty">
        <h2 className="bc-section-title">No matches found</h2>
        <p className="bc-section-hint">Try removing a trait to broaden your results.</p>
      </div>
    );
  }

  // Group matched results by match-strength band
  const grouped = BANDS.map(band => ({
    ...band,
    items: results.filter(c => c.score >= band.min && c.score <= band.max),
  })).filter(band => band.items.length > 0);

  return (
    <div className="bc-careers-wrap">
      <div className="bc-section-header">
        <h2 className="bc-section-title">Matched Careers</h2>
        <span className="bc-section-hint">{results.length} result{results.length !== 1 ? 's' : ''}</span>
      </div>
      {grouped.map(band => (
        <div key={band.key} className="bc-band">
          <div className="bc-band-header">
            <span className="bc-band-dot" style={{ background: band.dot }} />
            <span className="bc-band-label" style={{ color: band.dot }}>{band.label}</span>
            <span className="bc-band-range">{band.range}</span>
            <span className="bc-band-sep">·</span>
            <span className="bc-band-count">{band.items.length} career{band.items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="bc-cards-grid">
            {band.items.map(c => <CareerCard key={c.major} career={c} selectedTraits={selectedTraits} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
