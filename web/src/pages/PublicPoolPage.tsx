import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import './PublicPoolPage.css';

const PublicPoolPage = () => {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPool();
    }
  }, [id]);

  const loadPool = async () => {
    try {
      const data = await poolsApi.getOnePublic(id!);
      setPool(data);
    } catch (error) {
      console.error('Failed to load pool:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="public-page">Loading...</div>;
  }

  if (!pool) {
    return <div className="public-page">Pool not found</div>;
  }

  return (
    <div className="public-page">
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
              {pool.brackets?.map((bracket: any, index: number) => (
                <div key={bracket.id} className="leaderboard-item">
                  <span className="rank">#{index + 1}</span>
                  <span>{bracket.user?.username || 'Unknown'}</span>
                  <span className="score">{bracket.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h2>Members</h2>
          <div className="member-list">
            {pool.members?.map((member: any) => (
              <div key={member.id} className="member-item">
                {member.user?.username || 'Unknown'}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PublicPoolPage;

