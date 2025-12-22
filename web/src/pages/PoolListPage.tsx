import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import './PoolListPage.css';

const PoolListPage = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      const data = await poolsApi.getAll();
      setPools(data);
    } catch (error) {
      console.error('Failed to load pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode || inviteCode.length !== 8) {
      alert('Invalid invite code');
      return;
    }
    try {
      // Find pool by invite code
      // const allPools = await poolsApi.getAll();
      console.log('inviteCode', inviteCode);
      // console.log('allPools', allPools);
      const pool = await poolsApi.getByCode(inviteCode);
      // const pool = allPools.find((p) => p.inviteCode === inviteCode);
      if (!pool) {
        alert('Pool not found');
        return;
      }
      await poolsApi.join(pool.id, { inviteCode });
      setShowJoinModal(false);
      setInviteCode('');
      loadPools();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to join pool');
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

  return (
    <div>
      <Header />
      <div className="page">
        <div className="page-header">
          <h1>My Pools</h1>
          <div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary"
            >
              Join Pool
            </button>
            <Link to="/pools/new" className="btn btn-primary">
              Create Pool
            </Link>
          </div>
        </div>

        {showJoinModal && (
          <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Join Pool</h2>
              <input
                type="text"
                placeholder="Enter 8-digit invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <div className="modal-actions">
                <button onClick={handleJoin} className="btn btn-primary">
                  Join
                </button>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {pools.length === 0 ? (
          <p>No pools yet. Create or join a pool!</p>
        ) : (
          <div className="pool-list">
            {pools.map((pool) => (
              <Link key={pool.id} to={`/pools/${pool.id}`} className="pool-card">
                <h3>{pool.name}</h3>
                <p>Tournament: {pool.tournament?.name || 'Unknown'}</p>
                <p>Members: {pool.members?.length || 0}</p>
                <p className="invite-code">Code: {pool.inviteCode}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolListPage;

