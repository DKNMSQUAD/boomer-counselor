import './masthead.css';

export default function Masthead({ totalSelected, matchCount, totalCompanies, totalCriteria }) {
  return (
    <header className="bc-masthead">
      <div className="bc-masthead-inner">
        <div className="bc-masthead-left">
          <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' />
          <div className="bc-masthead-titles">
            <h1 className="bc-masthead-title">Tutor & Counselor Search</h1>
            <div className="bc-masthead-tagline">Find the right guide.</div>
          </div>
        </div>
        <div className="bc-masthead-stats">
          <div className="bc-masthead-stat">{totalCompanies} Providers</div>
          <div className="bc-masthead-stat">{totalCriteria} Filters</div>
        </div>
      </div>
    </header>
  );
}
