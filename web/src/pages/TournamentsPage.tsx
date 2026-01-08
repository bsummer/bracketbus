import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import HeaderPublic from '../components/common/HeaderPublic';
import { tournamentsApi } from '../api/tournaments';
import type { Tournament } from '../api/tournaments';
import './TournamentsPage.css';

const TournamentsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentsApi.getAll();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div>
        {isAuthenticated ? <Header /> : <HeaderPublic />}
        <div className="page">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {isAuthenticated ? <Header /> : <HeaderPublic />}
      <div className="page">
        <div className="page-header">
          <h1>Tournaments</h1>
        </div>
        {error && <div className="error-message">{error}</div>}
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p>No tournaments found.</p>
          </div>
        ) : (
          <div className="tournament-list">
            <div className="tournament-list-header">
              <span className="tournament-name">Tournament Name</span>
              <span className="tournament-date">Start Date</span>
              <span className="tournament-actions">View Bracket</span>
            </div>
            {tournaments.map((tournament) => (
              <div className="tournament-item" key={tournament.id}>
                <span className="tournament-name">{tournament.name}</span>
                <span className="tournament-date">
                  {formatDate(tournament.startDate)}
                </span>
                <span className="tournament-actions">
                  <Link
                    to={`/tournaments/${tournament.id}/bracket`}
                    className="btn btn-link"
                  >
                    View Bracket
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentsPage;

