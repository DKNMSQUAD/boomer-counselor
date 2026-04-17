import { useState, useMemo } from 'react';
import Masthead from './components/Masthead';
import TraitSelector from './components/TraitSelector';
import CareerGrid from './components/CareerGrid';
import { getMatches } from './data/careers';
import './index.css';

export default function App() {
  const [selected, setSelected] = useState([]);
  const toggle = id => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const results = useMemo(() => getMatches(selected), [selected]);

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8' }}>
      <Masthead matchCount={results.length} totalSelected={selected.length} />
      <TraitSelector selected={selected} onToggle={toggle} onClear={() => setSelected([])} />
      <CareerGrid results={results} selectedTraits={selected} />
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '20px 24px', textAlign: 'center', marginTop: 40 }}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Career Discovery
        </span>
      </footer>
    </div>
  );
}