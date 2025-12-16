import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { useAuth } from '../context/AuthContext';
import './PoolDetailPage.css';

const PoolDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPool();
    }
  }, [id]);

  const loadPool = async () => {
    try {
      const data = await poolsApi.getOne(id!);
      setPool(data);
    } catch (error) {
      console.error('Failed to load pool:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="page">Loading...</div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div>
        <Header />
        <div className="page">Pool not found</div>
      </div>
    );
  }

  const isCreator = pool.creatorId === user?.id;

  return (
    <div>
      <Header />
      <div className="page">
        <h1>{pool.name}</h1>
        <Link to={`/brackets/new?poolId=${pool.id}`} className="btn btn-primary">
          Create Bracket
        </Link>
        <div className="pool-info">
          <p>Tournament: {pool.tournament?.name || 'Unknown'}</p>
          <p className="invite-code">Invite Code: {pool.inviteCode}</p>
        </div>

        <section className="section">
          <h2>Members</h2>
          <div className="member-list">
            {pool.members?.map((member: any) => (
              <div key={member.id} className="member-item">
                <span>{member.user?.username || 'Unknown'}</span>
                {member.userId === user?.id && <span className="badge">You</span>}
                {isCreator && member.userId !== user?.id && (
                  <button
                    onClick={() => {
                      if (confirm('Remove this member?')) {
                        poolsApi.removeMember(pool.id, member.userId).then(loadPool);
                      }
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Brackets</h2>
          {pool.brackets?.length === 0 ? (
            <p>No brackets yet</p>
          ) : (
            <div className="bracket-list">
              {pool.brackets?.map((bracket: any) => (
                <Link
                  key={bracket.id}
                  to={`/brackets/${bracket.id}`}
                  className="bracket-link"
                >
                  {bracket.name} - {bracket.user?.username}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PoolDetailPage;

