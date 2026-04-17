import './masthead.css';

export default function Masthead({ matchCount, totalSelected }) {
  const statsRight = totalSelected === 0
    ? ['25 careers available']
    : [
        `${totalSelected} trait${totalSelected > 1 ? 's' : ''} selected`,
        matchCount > 0 ? `${matchCount} career${matchCount > 1 ? 's' : ''} matched` : 'No matches',
      ];

  return (
    <header className="bc-masthead">
      <div className="bc-masthead-inner">
        <div className="bc-masthead-left">
          <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' />
          <div className="bc-masthead-titles">
            <h1 className="bc-masthead-title">Career Discovery</h1>
            <div className="bc-masthead-tagline">Find your path.</div>
          </div>
        </div>
        <div className="bc-masthead-stats">
          {statsRight.map(s => (
            <div key={s} className="bc-masthead-stat">{s}</div>
          ))}
        </div>
      </div>
    </header>
  );
}
