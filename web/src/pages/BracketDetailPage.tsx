import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

  const getTeamsForGame = (game: any, allPicks: any[]): { team1: any; team2: any } => {
    // Round 1 games have teams populated
    if (game.round === 1) {
      return {
        team1: game.team1,
        team2: game.team2,
      };
    }
  
    // For Round 2+, get teams from parent game picks
    let team1 = null;
    let team2 = null;
  
    if (game.parentGame1Id) {
      const parent1Pick = allPicks.find((p) => p.gameId === game.parentGame1Id);
      if (parent1Pick?.predictedWinner) {
        team1 = parent1Pick.predictedWinner;
      }
    }
  
    if (game.parentGame2Id) {
      const parent2Pick = allPicks.find((p) => p.gameId === game.parentGame2Id);
      if (parent2Pick?.predictedWinner) {
        team2 = parent2Pick.predictedWinner;
      }
    }
  
    return { team1, team2 };
  };
  

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
                  const { team1, team2 } = getTeamsForGame(game, bracket.picks || []);
                  
                  return (
                    <div key={pick.id} className="pick-card">
                      <div className="game-info">Game {game?.gameNumber}</div>
                      <div className="pick-info">
                        <div className="team">
                          {team1?.name} (#{team1?.seed})
                        </div>
                        <div className="vs">vs</div>
                        <div className="team">
                          {team2?.name} (#{team2?.seed})
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

