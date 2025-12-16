import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/dashboard" className="logo">
          BracketBus
        </Link>
        <nav className="nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/brackets">Brackets</Link>
          <Link to="/pools">Pools</Link>
        </nav>
        <div className="user-section">
          <span>Welcome, {user?.username}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

