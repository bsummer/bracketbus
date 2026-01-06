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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (poolName) {
      loadPool();
    }
  }, [poolName]);

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
          {pool.brackets?.length === 0 ? (
            <p>No brackets yet</p>
          ) : (
            <div className="leaderboard">
              <div className="leaderboard-header">
                <span className="rank">Rank</span>
                <span className="username">Username</span>
                <span className="bracket-name">Bracket Name</span>
                <span className="pick">Pick</span>
                <span className="score">Score</span>
              </div>
              {pool.brackets?.map((bracket: any, index: number) => (
                <div key={bracket.id} className="leaderboard-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="username">{bracket.user?.username || 'Unknown'}</span>
                  <span className="bracket-name">{bracket.name}</span>
                  <span className="pick">{bracket.winner?.name || 'Unknown'}</span>
                  <span className="score">{bracket.pointsEarned? bracket.pointsEarned : 0}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        </div>
      </div>
    </div>
  );
};

export default PublicPoolPage;

