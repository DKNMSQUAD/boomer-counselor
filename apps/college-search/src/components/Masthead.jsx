import './masthead.css';

const Masthead = ({ colleges }) => {
  const collegeCount = colleges.length;
  return (
    <header className="bc-masthead">
      <div className="bc-masthead-inner">
        <div className="bc-masthead-left">
          <img className="bc-masthead-logo" src={import.meta.env.BASE_URL + 'bc-logo.png'} alt='Boomer Counselor' />
          <div className="bc-masthead-titles">
            <h1 className="bc-masthead-title">College Search</h1>
            <div className="bc-masthead-tagline">Find your match.</div>
          </div>
        </div>
        <div className="bc-masthead-stats">
          <div className="bc-masthead-stat">9 Regions</div>
          <div className="bc-masthead-stat">{collegeCount} Colleges</div>
          <div className="bc-masthead-stat">1,000s of courses</div>
        </div>
      </div>
    </header>
  );
};
export default Masthead;
