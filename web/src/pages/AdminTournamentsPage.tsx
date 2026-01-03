import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { tournamentsApi } from '../api/tournaments';
import type { Tournament } from '../api/tournaments';
import './AdminTournamentsPage.css';

const AdminTournamentsPage: React.FC = () => {
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
        <Header />
        <div className="page">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="page">
        <div className="page-header">
          <h1>Tournaments</h1>
          <div className="actions tournament-list-actions">
            <Link to="/admin/tournaments/new" className="btn">
              Create New Tournament
            </Link>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p>No tournaments found.</p>
            <Link to="/admin/tournaments/new" className="btn btn-primary">
              Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="tournament-list">
            <div className="tournament-list-header">
              <span className="tournament-name">Tournament Name</span>
              <span className="tournament-date">Start Date</span>
              <span className="tournament-actions">Actions</span>
            </div>
            {tournaments.map((tournament) => (
              <div className="tournament-item" key={tournament.id}>
                <span className="tournament-name">{tournament.name}</span>
                <span className="tournament-date">
                  {formatDate(tournament.startDate)}
                </span>
                <span className="tournament-actions">
                  <Link
                    to={`/admin/tournaments/${tournament.id}/edit`}
                    className="btn btn-link"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/admin/tournaments/${tournament.id}/teams`}
                    className="btn btn-link"
                  >
                    Teams
                  </Link>
                  <Link
                    to={`/admin/tournaments/${tournament.id}/games`}
                    className="btn btn-link"
                  >
                    Games
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

export default AdminTournamentsPage;

