import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import type { Bracket } from '../api/brackets';
import './BracketDetailPage.css';

const BracketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBracket();
    }
  }, [id]);

  const loadBracket = async () => {
    try {
      const data = await bracketsApi.getOne(id!);
      setBracket(data);
    } catch (error) {
      console.error('Failed to load bracket:', error);
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

  if (!bracket) {
    return (
      <div>
        <Header />
        <div className="page">Bracket not found</div>
      </div>
    );
  }

  const isLocked = !!bracket.lockedAt;
  const picksByRound = (bracket.picks || []).reduce((acc: any, pick: any) => {
    const round = pick.game?.round || 0;
    if (!acc[round]) acc[round] = [];
    acc[round].push(pick);
    return acc;
  }, {});

  return (
    <div>
      <Header />
      <div className="page">
        <div className="bracket-header">
          <h1>{bracket.name}</h1>
          <div className="bracket-info">
            <p>Pool: {bracket.pool?.name || 'Unknown'}</p>
            <p className={isLocked ? 'locked' : 'unlocked'}>
              {isLocked ? '🔒 Locked' : '✏️ Editable'}
            </p>
          </div>
        </div>

        <div className="bracket-view">
          {Object.entries(picksByRound).map(([round, picks]: [string, any]) => (
            <div key={round} className="round-section">
              <h3>Round {round}</h3>
              <div className="picks-grid">
                {picks.map((pick: any) => {
                  const game = pick.game;
                  const predicted = pick.predictedWinner;
                  const actual = game?.winner;
                  const isCorrect = actual && predicted?.id === actual.id;

                  return (
                    <div key={pick.id} className="pick-card">
                      <div className="game-info">Game {game?.gameNumber}</div>
                      <div className="pick-info">
                        <div className="team">
                          {game?.team1?.name} (#{game?.team1?.seed})
                        </div>
                        <div className="vs">vs</div>
                        <div className="team">
                          {game?.team2?.name} (#{game?.team2?.seed})
                        </div>
                      </div>
                      <div className="prediction">
                        <strong>Your Pick:</strong> {predicted?.name || 'None'}
                        {actual && (
                          <span className={isCorrect ? 'correct' : 'incorrect'}>
                            {isCorrect ? ' ✓' : ' ✗'}
                          </span>
                        )}
                      </div>
                      {actual && (
                        <div className="actual">
                          <strong>Winner:</strong> {actual.name}
                        </div>
                      )}
                      {pick.pointsEarned > 0 && (
                        <div className="points">+{pick.pointsEarned} points</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketDetailPage;

