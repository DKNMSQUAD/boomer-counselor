import './masthead.css';

export default function Masthead({ totalSelected, matchCount, totalCompanies, totalCriteria }) {
  return (
    <header className="bc-masthead">
      <div className="bc-masthead-inner">
        <div className="bc-masthead-left">
          <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'logo.png'} alt='Boomer Counselor' />
          <div className="bc-masthead-titles">
            <h1 className="bc-masthead-title">Profile Builder</h1>
            <div className="bc-masthead-tagline">Build your story.</div>
          </div>
        </div>
        <div className="bc-masthead-stats">
          <div className="bc-masthead-stat">{totalCompanies} Companies</div>
          <div className="bc-masthead-stat">{totalCriteria} Criteria</div>
        </div>
      </div>
    </header>
  );
}
