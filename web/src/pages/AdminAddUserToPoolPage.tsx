import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { usersApi } from '../api/users';
import type { User } from '../api/users';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import './AdminAddUserToPoolPage.css';

const AdminAddUserToPoolPage: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [poolId, setPoolId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, poolsData] = await Promise.all([
        usersApi.getAll(),
        poolsApi.getAllForAdmin(),
      ]);
      setUsers(usersData);
      setPools(poolsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load users or pools');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId || !poolId) {
      setError('Please select both a user and a pool');
      return;
    }

    setLoading(true);

    try {
      await poolsApi.addMember(poolId, userId);
      alert('User added to pool successfully!');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(errorMessage || 'Failed to add user to pool');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
        <h1>Add User to Pool</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="admin-add-user-form">
          <div className="form-group">
            <label htmlFor="userId">Select User *</label>
            <select
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="poolId">Select Pool *</label>
            <select
              id="poolId"
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Choose a pool...</option>
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Adding...' : 'Add User to Pool'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddUserToPoolPage;

