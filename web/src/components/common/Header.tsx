import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

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
          <span 
            className="username-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            Welcome, {user?.username}
          </span>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={handleLogout} className="dropdown-item">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

