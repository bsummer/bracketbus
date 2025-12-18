import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { gamesApi } from '../api/games';
import type { Game } from '../api/games';
import './CreateBracketPage.css';

const CreateBracketPage = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [poolId, setPoolId] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<{ [gameId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for poolId in URL query parameters
    const urlPoolId = searchParams.get('poolId');
    if (urlPoolId) {
      setPoolId(urlPoolId);
      loadPoolAndGames(urlPoolId);
    } else {
      loadData();
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [poolsData, gamesData] = await Promise.all([
        poolsApi.getAll(),
        gamesApi.getAll(),
      ]);
      setPools(poolsData);
      setGames(gamesData.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadPoolAndGames = async (poolIdParam: string) => {
    try {
      // Load pool to get tournamentId
      const pool = await poolsApi.getOne(poolIdParam);
      const tournamentId = pool.tournamentId;

      // Load all data
      const [poolsData, allGamesData] = await Promise.all([
        poolsApi.getAll(),
        gamesApi.getAll(),
      ]);

      // Filter games by tournamentId
      const tournamentGames = allGamesData.filter(
        (game) => game.tournamentId === tournamentId
      );

      setPools(poolsData);
      setGames(tournamentGames.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));
    } catch (error) {
      console.error('Failed to load pool and games:', error);
      // Fallback to loading all data
      loadData();
    }
  };

  

  // Group games by round
  const gamesByRound = useMemo(() => {
    return games.reduce((acc, game) => {
      if (!acc[game.round]) {
        acc[game.round] = [];
      }
      acc[game.round].push(game);
      return acc;
    }, {} as Record<number, Game[]>);
  }, [games]);

  // Calculate round completion status (commented out - not currently used)
  // const roundStatus = useMemo(() => {
  //   const status: Record<number, { completed: number; total: number; isComplete: boolean }> = {};
  //   
  //   Object.keys(gamesByRound).forEach((roundStr) => {
  //     const round = Number(roundStr);
  //     const roundGames = gamesByRound[round];
  //     const completed = roundGames.filter((game) => picks[game.id]).length;
  //     status[round] = {
  //       completed,
  //       total: roundGames.length,
  //       isComplete: completed === roundGames.length,
  //     };
  //   });
  //   
  //   return status;
  // }, [gamesByRound, picks]);
  
  // Get the current active round (first incomplete round) - commented out, not currently used
  // const activeRound = useMemo(() => {
  //   const rounds = Object.keys(gamesByRound).map(Number).sort((a, b) => a - b);
  //   return rounds.find((round) => !roundStatus[round]?.isComplete) || rounds[rounds.length - 1];
  // }, [gamesByRound, roundStatus]);

  // Get available teams for a game based on parent game picks
  const getAvailableTeams = (game: Game): { team1: Game['team1'] | null; team2: Game['team2'] | null } => {
    // Round 1 games always have teams
    if (game.round === 1) {
      return { team1: game.team1, team2: game.team2 };
    }

    // For Round 2+, get teams from parent game picks
    let team1: Game['team1'] = null;
    let team2: Game['team2'] = null;

    if (game.parentGame1Id) {
      const parent1Pick = picks[game.parentGame1Id];
      if (parent1Pick) {
        // Find the parent game and get the picked team
        const parent1Game = games.find((g) => g.id === game.parentGame1Id);
        if (parent1Game) {
          // The picked team ID should match one of the parent game's teams
          if (parent1Game.team1?.id === parent1Pick) {
            team1 = parent1Game.team1;
          } else if (parent1Game.team2?.id === parent1Pick) {
            team1 = parent1Game.team2;
          } else {
            // If team not found in parent, try to find it in all teams
            // This handles cases where the team comes from a deeper round
            const allTeams = games.flatMap((g) => [g.team1, g.team2]).filter(Boolean) as Array<NonNullable<Game['team1']>>;
            team1 = allTeams.find((t) => t?.id === parent1Pick) || null;
          }
        }
      }
    }

    if (game.parentGame2Id) {
      const parent2Pick = picks[game.parentGame2Id];
      if (parent2Pick) {
        const parent2Game = games.find((g) => g.id === game.parentGame2Id);
        if (parent2Game) {
          if (parent2Game.team1?.id === parent2Pick) {
            team2 = parent2Game.team1;
          } else if (parent2Game.team2?.id === parent2Pick) {
            team2 = parent2Game.team2;
          } else {
            const allTeams = games.flatMap((g) => [g.team1, g.team2]).filter(Boolean) as Array<NonNullable<Game['team1']>>;
            team2 = allTeams.find((t) => t?.id === parent2Pick) || null;
          }
        }
      }
    }

    return { team1, team2 };
  };
  
  const handlePick = (gameId: string, teamId: string) => {
    // setPicks({ ...picks, [gameId]: teamId });
    setPicks((prev) => {
      const newPicks = { ...prev, [gameId]: teamId };
      
      // Auto-populate dependent games
      const game = games.find((g) => g.id === gameId);
      if (game) {
        // Find games that depend on this game
        const dependentGames = games.filter(
          (g) => g.parentGame1Id === gameId || g.parentGame2Id === gameId,
        );

        dependentGames.forEach((dependentGame) => {
          // Clear dependent picks when parent changes
          if (dependentGame.parentGame1Id === gameId || dependentGame.parentGame2Id === gameId) {
            delete newPicks[dependentGame.id];
            
            // Recursively clear further dependent picks
            const furtherDependent = games.filter(
              (g) => g.parentGame1Id === dependentGame.id || g.parentGame2Id === dependentGame.id,
            );
            furtherDependent.forEach((fd) => {
              delete newPicks[fd.id];
            });
          }
        });
      } 
      
      return newPicks;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !poolId) {
      alert('Please fill in all required fields');
      return;
    }

    const picksArray = Object.entries(picks).map(([gameId, predictedWinnerId]) => ({
      gameId,
      predictedWinnerId,
    }));

    if (picksArray.length !== games.length) {
      alert('Please make picks for all games');
      return;
    }

    setLoading(true);
    try {
      const bracket = await bracketsApi.create({
        name,
        poolId,
        picks: picksArray,
      });
      navigate(`/brackets/${bracket.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create bracket');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <Header />
      <div className="page">
        <h1>Create Bracket</h1>
        <form onSubmit={handleSubmit} className="bracket-form">
          <div className="form-section">
            <div className="form-group">
              <label>Bracket Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Pool</label>
              <select
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                required
              >
                <option value="">Select a pool</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="games-section">
            <h2>Make Your Picks</h2>
            {Object.entries(gamesByRound).map(([round, roundGames]) => (
              <div key={round} className="round-section">
                <h3>Round {round}</h3>
                <div className="games-grid">
                  {roundGames.map((game) => {
                    const { team1, team2 } = getAvailableTeams(game);
                    // const team2 = getAvailableTeam(game.team2Id);
                    const selectedTeamId = picks[game.id];

                    return (
                      <div key={game.id} className="game-card">
                        <div className="game-header">Game {game.gameNumber}</div>
                        <div className="teams">
                          <button
                            type="button"
                            className={`team-btn ${selectedTeamId === team1?.id ? 'selected' : ''}`}
                            onClick={() => handlePick(game.id, team1?.id!)}
                            disabled={!team1?.id}
                          >
                            {team1 ? `${team1?.name} (#${team1?.seed})` : 'TBD'}
                          </button>
                          <div className="vs">vs</div>
                          <button
                            type="button"
                            className={`team-btn ${selectedTeamId === team2?.id ? 'selected' : ''}`}
                            onClick={() => handlePick(game.id, team2?.id!)}
                            disabled={!team2?.id}
                          >
                            {team2 ? `${team2?.name} (#${team2?.seed})` : 'TBD'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Creating...' : 'Create Bracket'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBracketPage;

