import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { useAuth } from '../context/AuthContext';
import './PoolDetailPage.css';

const PoolDetailPage = () => {
  const { id, poolName } = useParams<{ id?: string, poolName?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const identifier = poolName || id;

  useEffect(() => {
    if (identifier) {
      loadPool();
      loadLeaderboard();
    }
  }, [identifier]);

  const loadLeaderboard = async () => {
    try {
      const data = await poolsApi.getLeaderboard(id || poolName!);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };
  
  const loadPool = async () => {
    try {
      let data: Pool;
      if (poolName) {
        data = await poolsApi.getByName(poolName!);
      } else {
        data = await poolsApi.getOne(id!);
      }
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

  // Check if user already has a bracket in this pool
const hasUserBracket = pool.brackets?.some((bracket: any) => bracket.userId === user?.id);


  return (
    <div>
      <Header />
      <div className="page">
        <div className="page-header">
          <h1>{pool.name}</h1>
          <div>
            {!hasUserBracket && (
              <Link to={`/brackets/new?poolId=${pool.id}`} className="btn btn-primary">
                Create Bracket
              </Link>
            )}
          </div>
        </div>
        <div className="pool-info">
          <p>Tournament: {pool.tournament?.name || 'Unknown'}</p>
          <p>Members: {pool.members?.length || 0}</p>
          <p className="invite-code">Invite Code: {pool.inviteCode}</p>
        </div>

        {/* <section className="section">
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
        </section> */}

        <section className="section">
          <h2>Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p>No members yet</p>
          ) : (
            <table className="bracket-list">
              <thead>
                <tr className="leaderboard-header">
                  <th className="rank">Rank</th>
                  <th className="username">Username</th>
                  <th className="bracket-name">Bracket Name</th>
                  <th className="pickSelection">Pick</th>
                  <th className="score">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: any, index: number) => {
                  const hasBracket = entry.hasBracket !== false && entry.id;
                  const handleRowClick = () => {
                    if (hasBracket) {
                      navigate(`/brackets/${entry.id}`);
                    }
                  };
                  
                  return (
                    <tr
                      key={hasBracket ? entry.id : `no-bracket-${entry.userId}`}
                      className={`${index % 2 === 0 ? "leaderboard-item odd" : "leaderboard-item even"} ${hasBracket ? "clickable-row" : ""}`}
                      onClick={handleRowClick}
                      style={hasBracket ? { cursor: 'pointer' } : {}}
                    >
                      <td className="rank">#{entry.rank || index + 1}</td>
                      <td className="username">{entry.user?.username || 'Unknown'}</td>
                      <td className="bracket-name">
                        {hasBracket ? entry.name : <span style={{ fontStyle: 'italic', color: '#999' }}>No bracket</span>}
                      </td>
                      <td className="pickSelection">
                        {hasBracket ? (entry.winner?.name || '—') : <span style={{ fontStyle: 'italic', color: '#999' }}>—</span>}
                      </td>
                      <td className="score">{entry.totalPoints || 0} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        
      </div>
    </div>
  );
};

export default PoolDetailPage;

