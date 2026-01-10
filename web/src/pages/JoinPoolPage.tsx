import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { poolsApi } from '../api/pools';
import Header from '../components/common/Header';
import HeaderPublic from '../components/common/HeaderPublic';
import './JoinPoolPage.css';

const JoinPoolPage = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code') || '';
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login with return URL
    if (!authLoading && !isAuthenticated && inviteCode) {
      const returnUrl = `/pools/join?code=${encodeURIComponent(inviteCode)}`;
      navigate('/login', { state: { returnUrl } });
      return;
    }

    // If authenticated and we have a code, attempt to join (only once)
    if (!authLoading && isAuthenticated && inviteCode && !joining && !error) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode) {
      setError('Invite code is required');
      return;
    }

    if (joining) {
      return; // Prevent duplicate joins
    }

    setJoining(true);
    setError(null);

    try {
      const pool = await poolsApi.joinByCode(inviteCode);
      // Redirect to pool detail page
      navigate(`/pools/${pool.id}`);
    } catch (err: any) {
      console.error('Failed to join pool:', err);
      const errorMessage = err?.response?.data?.message || 'Invalid invite code';
      if (errorMessage.includes('Invalid invite code') || errorMessage.includes('not found') || errorMessage.includes('Pool not found')) {
        setError("Oops, that code isn't working. Let's try again by copying and pasting the link from your invite email.");
      } else if (errorMessage.includes('Already a member')) {
        // If already a member, still redirect to pool
        const pool = await poolsApi.getByCode(inviteCode);
        navigate(`/pools/${pool.id}`);
      } else {
        setError(errorMessage);
      }
      setJoining(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div>
        <HeaderPublic />
        <div className="join-pool-page">
          <div className="join-pool-container">Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, the useEffect will handle redirect
  // But show a message briefly
  if (!isAuthenticated) {
    return (
      <div>
        <HeaderPublic />
        <div className="join-pool-page">
          <div className="join-pool-container">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  // If authenticated but no code, show error
  if (!inviteCode) {
    return (
      <div>
        <Header />
        <div className="join-pool-page">
          <div className="join-pool-container">
            <h1>Join Pool</h1>
            <div className="error-message">
              No invite code provided. Please use the link from your invite email.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show joining state or error
  return (
    <div>
      <Header />
      <div className="join-pool-page">
        <div className="join-pool-container">
          <h1>Join Pool</h1>
          {joining && !error && (
            <div className="loading-message">Joining pool...</div>
          )}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinPoolPage;

