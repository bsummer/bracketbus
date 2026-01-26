import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import HeaderPublic from '../components/common/HeaderPublic';
import './PublicPoolPage.css';

const PublicPoolPage = () => {
  const { poolName } = useParams<{ poolName: string }>();
  const { isAuthenticated } = useAuth();
  const [pool, setPool] = useState<Pool | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (poolName) {
      loadPool();
      loadLeaderboard();
    }
  }, [poolName]);

  const loadLeaderboard = async () => {
    try {
      const poolData = await poolsApi.getByName(poolName!);
      const data = await poolsApi.getLeaderboard(poolData.id);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const loadPool = async () => {
    try {
      const data = await poolsApi.getByName(poolName!);
      setPool(data);
    } catch (error) {
      console.error('Failed to load pool:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page">
        {!isAuthenticated && <HeaderPublic />}
        {isAuthenticated && <Header />}
        <div className="public-page-content">Loading...</div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="public-page">
        {!isAuthenticated && <HeaderPublic />}
        {isAuthenticated && <Header />}
        <div className="public-page-content">Pool not found</div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {!isAuthenticated && <HeaderPublic />}
      {isAuthenticated && <Header />}
      <div className="public-page-content">
        <div className="public-container">
        <h1>{pool.name}</h1>
        <div className="pool-info">
          <p>Tournament: {pool.tournament?.name || 'Unknown'}</p>
          <p>Members: {pool.members?.length || 0}</p>
        </div>

        <section className="section">
          <h2>Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p>No members yet</p>
          ) : (
            <table className="leaderboard">
              <thead>
                <tr className="leaderboard-header">
                  <th className="rank">Rank</th>
                  <th className="username">Username</th>
                  <th className="bracket-name">Bracket Name</th>
                  <th className="pick">Pick</th>
                  <th className="score">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: any, index: number) => {
                  const hasBracket = entry.hasBracket !== false && entry.id;
                  return (
                    <tr key={hasBracket ? entry.id : `no-bracket-${entry.userId}`} className="leaderboard-item">
                      <td className="rank">#{index + 1}</td>
                      <td className="username">{entry.user?.username || 'Unknown'}</td>
                      <td className="bracket-name">
                        {hasBracket ? entry.name : <span style={{ fontStyle: 'italic', color: '#999' }}>No bracket</span>}
                      </td>
                      <td className="pick">
                        {hasBracket ? (entry.winner?.name || '—') : <span style={{ fontStyle: 'italic', color: '#999' }}>—</span>}
                      </td>
                      <td className="score">{entry.totalPoints || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        </div>
      </div>
    </div>
  );
};

export default PublicPoolPage;

