import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="home-header">
        <Link to="/login" className="login-link">Login</Link>
      </div>
      <div className="home-container">
        <h1 className="site-title">BracketBus</h1>
        <div className="description-section">
          <p className="description">
            BracketBus is a tournament bracket management platform where you can create and manage 
            your tournament brackets, join pools, compete with friends, and track your predictions 
            throughout the tournament.
          </p>
        </div>
        <div className="instructions-section">
          <h2>Viewing Public Pool Pages</h2>
          <p>
            You can view public pool leaderboards and brackets without logging in. Public pools can be 
            accessed in two ways:
          </p>
          <ul>
            <li>
              <strong>By Pool ID:</strong> Navigate to <code>/pools/[pool-id]/public</code>
            </li>
            <li>
              <strong>By Pool Name:</strong> Navigate to <code>/[pool-name]</code>
            </li>
          </ul>
          <p>
            Simply replace <code>[pool-id]</code> or <code>[pool-name]</code> with the actual pool 
            identifier or name to view the public leaderboard and brackets.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

