import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setIsAdminDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen || isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen, isAdminDropdownOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
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
          {isAdmin && (
            <div className="admin-section" ref={adminDropdownRef}>
              <span 
                className="admin-trigger"
                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
              >
                Admin
              </span>
              {isAdminDropdownOpen && (
                <div className="dropdown-menu">
                  <Link 
                    to="/admin/games" 
                    className="dropdown-item"
                    onClick={() => setIsAdminDropdownOpen(false)}
                  >
                    Manage Games
                  </Link>
                  <Link 
                    to="/admin/users" 
                    className="dropdown-item"
                    onClick={() => setIsAdminDropdownOpen(false)}
                  >
                    Users
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="user-section" ref={userDropdownRef}>
          <span 
            className="username-trigger"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          >
            Welcome, {user?.username}
          </span>
          {isUserDropdownOpen && (
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

