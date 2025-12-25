import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import type { Bracket } from '../api/brackets';
import './BracketListPage.css';

const BracketListPage = () => {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrackets();
  }, []);

  const loadBrackets = async () => {
    try {
      const data = await bracketsApi.getAll();
      setBrackets(data);
    } catch (error) {
      console.error('Failed to load brackets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bracket?')) return;
    try {
      await bracketsApi.delete(id);
      loadBrackets();
    } catch (_error) {
      alert('Failed to delete bracket');
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
          <h1>My Brackets</h1>
          <Link to="/brackets/new" className="btn btn-primary">
            Create Bracket
          </Link>
        </div>

        {brackets.length === 0 ? (
          <p>No brackets yet. Create your first bracket!</p>
        ) : (
          <div className="bracket-list">
            {brackets.map((bracket) => (
              <div key={bracket.id} className="bracket-card">
                <Link to={`/brackets/${bracket.id}`}>
                  <h3>{bracket.name}</h3>
                  <p>Pool: {bracket.pool?.name || 'Unknown'}</p>
                  <p className={bracket.lockedAt ? 'locked' : 'unlocked'}>
                    {bracket.lockedAt ? '🔒 Locked' : '✏️ Editable'}
                  </p>
                </Link>
                {!bracket.lockedAt && (
                  <button
                    onClick={() => handleDelete(bracket.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketListPage;

