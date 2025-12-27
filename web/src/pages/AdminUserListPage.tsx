import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { usersApi } from '../api/users';
import type { User, UserForAdmin } from '../api/users';
import './AdminUserListPage.css';

const AdminUserListPage: React.FC = () => {
  const [users, setUsers] = useState<UserForAdmin[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData] = await Promise.all([
        usersApi.getAllForAdmin(),
      ]);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load users');
    } finally {
      setLoadingData(false);
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
        <div className="page-header">
          <h1>Users</h1>
          <div className="actions user-list-actions">
            <Link to="/admin/users/new" className="btn">Create</Link>
            <Link to="/admin/users/add-to-pool" className="btn">Add to Pool</Link>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="user-list">
          <div className="user-list-header">
            <span className="user-name">Name</span>
            <span className="user-email">Email</span>
            <span className="user-pool-count">Pools</span>
            <span className="user-bracket-count">Brackets</span>
          </div>
        {users.sort((a: UserForAdmin, b: UserForAdmin) => a.username.localeCompare(b.username))
          .map((user: UserForAdmin) => (
          <div className="user-item" key={user.id} >
            <span className="user-name">
              {user.username}
            </span>
            <span className="user-email">
              {user.email}
            </span>
            <span className="user-pool-count">
              {user.poolCount}
            </span>
            <span className="user-bracket-count">
              {user.bracketCount}
            </span>
            <span className="add-to-pool-btn">
              <Link to={`/admin/users/add-to-pool?userId=${user.id}`} className="btn btn-primary">Add to Pool</Link>
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUserListPage;
