import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { usersApi } from '../api/users';
import './CreateUserPage.css';

const CreateUserPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = (location.state as any)?.returnUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== verifyPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await usersApi.createPublic({
        username,
        email,
        password,
      });
      // Redirect to login page on success, preserving returnUrl
      const loginState: any = { message: 'Account created successfully. Please login.' };
      if (returnUrl) {
        loginState.returnUrl = returnUrl;
      }
      navigate('/login', { state: loginState });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-user-page">
      <div className="create-user-container">
        <h1>BracketBus</h1>
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Verify Password</label>
            <input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="login-link">
          <Link to="/login" state={returnUrl ? { returnUrl } : undefined}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;

