import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { gamesApi } from '../api/games';
import type { Game } from '../api/games';
import { useAuth } from '../context/AuthContext';
import './CreateBracketPage.css';

const CreateBracketPage = () => {
  const { id: bracketId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditMode = !!bracketId;
  
  const [name, setName] = useState('');
  const [poolId, setPoolId] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<{ [gameId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const loadBracketForEdit = useCallback(async (id: string) => {
    try {
      const bracket = await bracketsApi.getOne(id);
      
      // Check if user owns this bracket
      if (bracket.userId !== user?.id) {
        alert('You can only edit your own brackets');
        navigate('/brackets');
        return;
      }

      // Check if bracket is locked
      if (bracket.isLocked) {
        alert('This bracket is locked and cannot be edited');
        navigate(`/brackets/${id}`);
        return;
      }

      setName(bracket.name);
      setPoolId(bracket.poolId);

      // Load pool and games
      const pool = await poolsApi.getOne(bracket.poolId);
      const allGames = await gamesApi.getAll();
      const tournamentGames = allGames.filter(
        (game) => game.tournamentId === pool.tournamentId
      );

      setPools([pool]);
      setGames(tournamentGames.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));

      // Load existing picks
      const existingPicks: { [gameId: string]: string } = {};
      if (bracket.picks) {
        bracket.picks.forEach((pick) => {
          existingPicks[pick.gameId] = pick.predictedWinnerId;
        });
      }
      setPicks(existingPicks);
    } catch (error) {
      console.error('Failed to load bracket:', error);
      alert('Failed to load bracket');
      navigate('/brackets');
    }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
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
  }, []);

  const loadPoolAndGames = useCallback(async (poolIdParam: string) => {
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
  }, [loadData]);

  useEffect(() => {
    if (isEditMode && bracketId) {
      loadBracketForEdit(bracketId);
    }
  }, [bracketId, isEditMode, loadBracketForEdit]);
  
  useEffect(() => {
    // Check for poolId in URL query parameters
    const urlPoolId = searchParams.get('poolId');
    if (urlPoolId) {
      setPoolId(urlPoolId);
      loadPoolAndGames(urlPoolId);
    } else {
      loadData();
    }
  }, [searchParams, loadPoolAndGames, loadData]);

  

  // Get available teams for a game based on parent game picks
  const getAvailableTeams = useCallback((game: Game): { team1: Game['team1'] | null; team2: Game['team2'] | null } => {
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
  }, [games, picks]);

  // Helper function to get region from a game (for Round 2+ games, check parent games)
  const getGameRegion = useCallback((game: Game, gamesMap: Map<string, Game>): string => {
    const round = game.round || 0;
    
    // For rounds 5-6 (Final Four, Championship), always use 'center'
    if (round >= 5) {
      return 'center';
    }
    
    // For Round 1, get region from teams
    if (round === 1) {
      const teamRegion = (game.team1 as any)?.region || (game.team2 as any)?.region;
      if (teamRegion) {
        return teamRegion;
      }
    }
    
    // For Round 2+, try to get region from parent games
    if (round >= 2 && round <= 4) {
      // Find parent games
      const parent1Game = game.parentGame1Id ? gamesMap.get(game.parentGame1Id) : null;
      const parent2Game = game.parentGame2Id ? gamesMap.get(game.parentGame2Id) : null;
      
      // Try to get region from parent games (they should be in the same region)
      if (parent1Game) {
        const parent1Region = getGameRegion(parent1Game, gamesMap);
        if (parent1Region !== 'center') {
          return parent1Region;
        }
      }
      if (parent2Game) {
        const parent2Region = getGameRegion(parent2Game, gamesMap);
        if (parent2Region !== 'center') {
          return parent2Region;
        }
      }
      
      // If we can't determine from parents, try from available teams
      const { team1, team2 } = getAvailableTeams(game);
      const teamRegion = (team1 as any)?.region || (team2 as any)?.region;
      if (teamRegion) {
        return teamRegion;
      }
    }
    
    return 'center';
  }, [getAvailableTeams]);

  // Group games by region and round
  const gamesByRegionAndRound = useMemo(() => {
    // Create a map for faster lookups
    const gamesMap = new Map(games.map(g => [g.id, g]));
    
    return games.reduce((acc: Record<string, Record<number, Game[]>>, game) => {
      const round = game.round || 0;
      const region = getGameRegion(game, gamesMap);
      
      if (!acc[region]) acc[region] = {};
      if (!acc[region][round]) acc[region][round] = [];
      acc[region][round].push(game);
      return acc;
    }, {});
  }, [games, getGameRegion]);

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(region)) {
        newSet.delete(region);
      } else {
        newSet.add(region);
      }
      return newSet;
    });
  };

  // Sort regions: East, West, South, Midwest, then center
  const regionOrder: Record<string, number> = {
    'East': 1,
    'West': 2,
    'South': 3,
    'Midwest': 4,
    'center': 5
  };

  const sortedRegions = Object.entries(gamesByRegionAndRound).sort(([a], [b]) => {
    return (regionOrder[a] || 99) - (regionOrder[b] || 99);
  });

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
      if (isEditMode && bracketId) {
        await bracketsApi.update(bracketId, {
          picks: picksArray,
        });
        navigate(`/brackets/${bracketId}`);
      } else {
        const bracket = await bracketsApi.create({
          name,
          poolId,
          picks: picksArray,
        });
        navigate(`/brackets/${bracket.id}`);
      }
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      alert(errorMessage || `Failed to ${isEditMode ? 'update' : 'create'} bracket`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <Header />
      <div className="page">
        <div className="bracket-header">
          <h1>{isEditMode ? 'Edit Bracket' : 'Create Bracket'}</h1>
          <form onSubmit={handleSubmit} className="bracket-form">
            <div className="form-section">
              <div className="form-group">
                <label>Bracket Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isEditMode}
                />
              </div>
              {!isEditMode && (
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
              )}
            </div>

            <div className="bracket-accordion">
              {sortedRegions.map(([region, gamesByRound]) => {
                const isCenter = region === 'center';
                const isExpanded = expandedRegions.has(region);
                const regionTitle = isCenter ? 'Final Four' : `${region} Region`;
                
                return (
                  <div key={region} className="accordion-item">
                    <button
                      type="button"
                      className="accordion-header"
                      onClick={() => toggleRegion(region)}
                    >
                      <span className={`accordion-arrow ${isExpanded ? 'expanded' : ''}`}>
                        →
                      </span>
                      <span className="accordion-title">{regionTitle}</span>
                    </button>
                    {isExpanded && (
                      <div className="accordion-content">
                        <div className="bracket-region">
                          {Object.entries(gamesByRound)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([round, roundGames]) => (
                              <div key={round} className={`round-container round-${round} ${isCenter ? 'round-center' : ''}`}>
                                {isCenter && (
                                  <h3 className="round-title">
                                    {Number(round) === 5 ? 'Final Four' : Number(round) === 6 ? 'Championship' : `Round ${round}`}
                                  </h3>
                                )}
                                <div className={`games-list ${isCenter ? 'games-center' : ''}`}>
                                  {roundGames.map((game) => {
                                    const { team1, team2 } = getAvailableTeams(game);
                                    const selectedTeamId = picks[game.id];
                                    
                                    // Check if game has started or completed
                                    const now = new Date();
                                    const gameStarted = 
                                      game.status === 'in_progress' ||
                                      game.status === 'completed' ||
                                      (game.gameDate && new Date(game.gameDate) <= now);
                                    const isDisabled = gameStarted;

                                    return (
                                      <div key={game.id} className="game-card">
                                        <div className="pick-info">
                                          <button
                                            type="button"
                                            className={`team-btn ${selectedTeamId === team1?.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${!team1?.id ? 'tbd' : ''}`}
                                            onClick={() => {
                                              if (team1?.id && !isDisabled) {
                                                handlePick(game.id, team1.id);
                                              }
                                            }}
                                            disabled={!team1?.id || isDisabled}
                                          >
                                            <span className="seed-container">
                                              {team1?.seed || ''}
                                            </span>
                                            <span className="logo-container">
                                              {team1?.logoUrl ? (
                                                <img src={team1.logoUrl} alt={team1.name} className="team-logo" />
                                              ) : (
                                                <span className="tbd-placeholder">—</span>
                                              )}
                                            </span>
                                            <span className="name-container">
                                              {team1 ? team1.name : 'TBD'}
                                            </span>
                                          </button>
                                          <button
                                            type="button"
                                            className={`team-btn ${selectedTeamId === team2?.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${!team2?.id ? 'tbd' : ''}`}
                                            onClick={() => {
                                              if (team2?.id && !isDisabled) {
                                                handlePick(game.id, team2.id);
                                              }
                                            }}
                                            disabled={!team2?.id || isDisabled}
                                          >
                                            <span className="seed-container">
                                              {team2?.seed || ''}
                                            </span>
                                            <span className="logo-container">
                                              {team2?.logoUrl ? (
                                                <img src={team2.logoUrl} alt={team2.name} className="team-logo" />
                                              ) : (
                                                <span className="tbd-placeholder">—</span>
                                              )}
                                            </span>
                                            <span className="name-container">
                                              {team2 ? team2.name : 'TBD'}
                                            </span>
                                          </button>
                                        </div>
                                        {isDisabled && (
                                          <div className="locked-badge">🔒 Locked</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Bracket' : 'Create Bracket')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBracketPage;