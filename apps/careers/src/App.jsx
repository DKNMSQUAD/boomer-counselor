import { useState, useMemo, useEffect, useRef } from 'react';
import Masthead from './components/Masthead';
import TraitSelector from './components/TraitSelector';
import CareerGrid from './components/CareerGrid';
import { getMatches, TRAITS } from './data/careers';
import { emitEvent } from './bcEvents';
import './index.css';

export default function App() {
  const [selected, setSelected] = useState([]);
  const debounceRef = useRef(null);
  const toggle = id => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const onClear = () => {
    if (selected.length > 0) {
      emitEvent('tool_filter', { action: 'clear_all', extraData: { previousSelections: selected.length } });
    }
    setSelected([]);
  };
  const results = useMemo(() => getMatches(selected), [selected]);

  // Debounced filter-applied log: fires 1.5s after the user stops toggling traits.
  // Sends the FULL set of currently selected trait labels so the Analytics sheet
  // can compute career matches server-side in one go.
  useEffect(() => {
    if (!selected.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const labels = selected.map(id => TRAITS.find(t => t.id === id)?.label).filter(Boolean);
      emitEvent('tool_filter', {
        action: 'apply',
        targetLabel: labels.join(', '),
        extraData: {
          selected_traits: labels,
          total_selected: selected.length,
          match_count: results.length,
        },
      });
    }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selected, results.length]);

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