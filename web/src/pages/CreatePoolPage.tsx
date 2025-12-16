import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { poolsApi } from '../api/pools';
import { gamesApi } from '../api/games';
import './CreatePoolPage.css';

const CreatePoolPage = () => {
  const [name, setName] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get tournaments from games
    gamesApi.getAll().then((games) => {
      const uniqueTournaments = Array.from(
        new Map(games.map((g: any) => [g.tournamentId, g.tournament])).values()
      );
      setTournaments(uniqueTournaments);
      if (uniqueTournaments.length > 0) {
        setTournamentId(uniqueTournaments[0].id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !tournamentId) return;

    setLoading(true);
    try {
      const pool = await poolsApi.create({ name, tournamentId });
      navigate(`/pools/${pool.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create pool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="page">
        <h1>Create Pool</h1>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Pool Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Tournament</label>
            <select
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              required
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Creating...' : 'Create Pool'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePoolPage;

