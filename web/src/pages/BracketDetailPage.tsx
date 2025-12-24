import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import type { Bracket } from '../api/brackets';
import { useAuth } from '../context/AuthContext';
import './BracketDetailPage.css';

const BracketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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

  const isLocked = bracket.isLocked;
  const isOwner = bracket.userId === user?.id;
  const canEdit = !isLocked && isOwner;
  console.log('canEdit', canEdit);
  console.log('isLocked', bracket.isLocked);
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
            {canEdit && (
              <Link to={`/brackets/${id}/edit`} className="btn btn-primary">
                Edit Bracket
              </Link>
            )}
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
                        <div className={game.winnerId === team1?.id ? "team winner" : "team"}>
                          <span className="logo-container">
                            <img src={team1?.logoUrl} alt={team1?.name} className="team-logo" />
                          </span>
                          <span className="seed-container">
                            {team1?.seed}
                          </span>
                          <span className="name-container">
                            {team1 ? `${team1?.name}` : 'TBD'}
                          </span>
                          <span className="team-score">
                            {game?.scoreTeam1}
                          </span>
                        </div>
                        <div className="vs">vs</div>
                        <div className={game.winnerId === team2?.id ? "team winner" : "team"}>
                          <span className="logo-container">
                            <img src={team2?.logoUrl} alt={team2?.name} className="team-logo" />
                          </span>
                          <span className="seed-container">
                            {team2?.seed}
                          </span>
                          <span className="name-container">
                            {team2 ? `${team2?.name}` : 'TBD'}
                          </span>
                          <span className="team-score">
                            {game?.scoreTeam2}
                          </span>
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
                      {/* {actual && (
                        <div className="actual">
                          <strong>Winner:</strong> {actual.name}
                        </div>
                      )} */}
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

