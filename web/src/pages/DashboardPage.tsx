import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import { poolsApi } from '../api/pools';
import type { Bracket } from '../api/brackets';
import type { Pool } from '../api/pools';
import './DashboardPage.css';

const DashboardPage = () => {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bracketsData, poolsData] = await Promise.all([
          bracketsApi.getAll(),
          poolsApi.getAll(),
        ]);
        setBrackets(bracketsData);
        setPools(poolsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="dashboard">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="actions">
            <Link to="/brackets/new" className="btn btn-primary">
              Create Bracket
            </Link>
            <Link to="/pools/new" className="btn btn-primary">
              Create Pool
            </Link>
          </div>
        </div>

        <div className="dashboard-content">
          <section className="section">
            <h2>My Brackets</h2>
            {brackets.length === 0 ? (
              <p>No brackets yet. Create your first bracket!</p>
            ) : (
              <div className="card-list">
                {brackets.map((bracket) => (
                  <Link
                    key={bracket.id}
                    to={`/brackets/${bracket.id}`}
                    className="card"
                  >
                    <h3>{bracket.name}</h3>
                    <p>Pool: {bracket.pool?.name || 'Unknown'}</p>
                    <p className={bracket.lockedAt ? 'locked' : 'unlocked'}>
                      {bracket.lockedAt ? '🔒 Locked' : '✏️ Editable'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <h2>My Pools</h2>
            {pools.length === 0 ? (
              <p>No pools yet. Create or join a pool!</p>
            ) : (
              <div className="card-list">
                {pools.map((pool) => (
                  <Link key={pool.id} to={`/pools/${pool.id}`} className="card">
                    <h3>{pool.name}</h3>
                    <p>Tournament: {pool.tournament?.name || 'Unknown'}</p>
                    <p>Members: {pool.members?.length || 0}</p>
                    <p className="invite-code">Code: {pool.inviteCode}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

