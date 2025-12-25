import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { usersApi } from '../api/users';
import type { CreateUserDto } from '../api/users';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import './AdminCreateUserPage.css';

const AdminCreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [poolId, setPoolId] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPools, setLoadingPools] = useState(true);

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      const data = await poolsApi.getAllForAdmin();
      console.log('data', data);
      setPools(data);
    } catch (err) {
      console.error('Failed to load pools:', err);
    } finally {
      setLoadingPools(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const createUserDto: CreateUserDto = {
        username,
        email,
        password,
        ...(poolId && { poolId }),
      };

      await usersApi.create(createUserDto);
      alert('User created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(errorMessage || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="page">
        <h1>Create New User</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="admin-create-user-form">
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <small>Minimum 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="poolId">Add to Pool (Optional)</label>
            {loadingPools ? (
              <div>Loading pools...</div>
            ) : (
              <select
                id="poolId"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                disabled={loading}
              >
                <option value="">None</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create User'}
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

export default AdminCreateUserPage;

