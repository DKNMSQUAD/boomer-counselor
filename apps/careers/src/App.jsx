import { useState, useMemo } from 'react';
import Masthead from './components/Masthead';
import TraitSelector from './components/TraitSelector';
import CareerGrid from './components/CareerGrid';
import { getMatches, TRAITS } from './data/careers';
import { emitEvent } from './bcEvents';
import './index.css';

export default function App() {
  const [selected, setSelected] = useState([]);
  const toggle = id => {
    const trait = TRAITS.find(t => t.id === id);
    const wasSelected = selected.includes(id);
    emitEvent('tool_filter', {
      action: wasSelected ? 'remove' : 'add',
      targetId: id,
      targetLabel: trait?.label || id,
      extraData: { filterType: 'trait' },
    });
    setSelected(prev => wasSelected ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const onClear = () => {
    if (selected.length > 0) {
      emitEvent('tool_filter', { action: 'clear_all', extraData: { previousSelections: selected.length } });
    }
    setSelected([]);
  };
  const results = useMemo(() => getMatches(selected), [selected]);

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <Masthead matchCount={results.length} totalSelected={selected.length} />
      <TraitSelector selected={selected} onToggle={toggle} onClear={onClear} />
      <CareerGrid results={results} selectedTraits={selected} />
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '20px 24px', textAlign: 'center', marginTop: 40 }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Career Discovery
        </span>
      </footer>
    </div>
  );
}