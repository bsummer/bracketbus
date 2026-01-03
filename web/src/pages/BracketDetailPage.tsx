import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import type { Bracket, BracketPick } from '../api/brackets';
import type { Game } from '../api/games';
import type { Team } from '../api/teams';
import { useAuth } from '../context/AuthContext';
import './BracketDetailPage.css';

const BracketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null); // Add this state


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

  useEffect(() => {
    if (id) {
      loadBracket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const getTeamsForGame = (game: Game | undefined, allPicks: BracketPick[]): { team1: Team | null; team2: Team | null } => {
    if (!game) {
      return { team1: null, team2: null };
    }

    // Round 1 games have teams populated
    if (game.round === 1) {
      return {
        team1: game.team1 ?? null,
        team2: game.team2 ?? null,
      };
    }
  
    // For Round 2+, get teams from parent game picks
    let team1: Team | null = null;
    let team2: Team | null = null;
  
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

  const picksByRegionAndRound = (bracket.picks || []).reduce((acc: Record<string, Record<number, BracketPick[]>>, pick: BracketPick) => {
    const game = pick.game;
    const round = game?.round || 0;
    
    // For rounds 1-4, group by region
    // For rounds 5-6 (Final Four, Championship), use 'center'
    let region = 'center';
    if (round <= 4 && game) {
      const { team1, team2 } = getTeamsForGame(game, bracket.picks || []);
      // Get region from team1 (or team2 if team1 doesn't have it)
      const teamRegion = (team1 as any)?.region || (team2 as any)?.region;
      if (teamRegion) {
        region = teamRegion;
      }
    }
    
    if (!acc[region]) acc[region] = {};
    if (!acc[region][round]) acc[region][round] = [];
    acc[region][round].push(pick);
    return acc;
  }, {});

  // Define region positions
  const regionPositions: Record<string, string> = {
    'East': 'top-left',
    'West': 'top-right',
    'South': 'bottom-left',
    'Midwest': 'bottom-right',
    'center': 'center'
  };

   // Get available regions (excluding 'center')
   const availableRegions = Object.keys(picksByRegionAndRound);


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

        <div className="region-filters">
          <span className="region-filter-label">Filter by region:</span>
          {availableRegions.map((region) => (
              
            <span key={region}>
              <button
                className={`region-filter-link ${selectedRegion === region ? 'active' : ''}`}
                onClick={() => setSelectedRegion(region)}
              >
                {region === 'center' ? 'Semis & Finals' : region}
              </button>
            </span>
          ))}
        </div>

        <div className={`bracket-container ${selectedRegion ? 'single-region-view' : ''}`}>
          {/* Render each region */}
          {Object.entries(picksByRegionAndRound).map(([region, picksByRound]) => {
            const position = regionPositions[region] || 'center';
            const isCenter = region === 'center';
            console.log(selectedRegion, "region", region);

            // Hide region if a specific region is selected and this isn't it
            // Always show center region, or show it when no region is selected
            const shouldShow = selectedRegion === null 
              ? true 
              : selectedRegion === region;
            
            if (!shouldShow) return null;
            console.log("shouldShow", shouldShow);
            
            return (
              <div key={region} className={`bracket-region bracket-region-${position}`}>
                {isCenter ? (
                  <h3 className="region-title">Semis and Finals</h3>
                ) : (
                  <h3 className="region-title">{region} Region</h3>
                )}
                {Object.entries(picksByRound)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([round, picks]) => (
                    <div key={round} className={`round-container round-${round} ${isCenter ? 'round-center' : ''}`}>
                      {isCenter && (
                        <h3 className="round-title">
                          {Number(round) === 5 ? 'Final Four' : Number(round) === 6 ? 'Championship' : `Round ${round}`}
                        </h3>
                      )}
                      <div className={`games-list ${isCenter ? 'games-center' : ''}`}>
                        {picks.map((pick) => {
                          const game = pick.game;
                          const predicted = pick.predictedWinner;
                          // const actual = game?.winner;
                          // const isCorrect = actual && predicted?.id === actual.id;
                          const { team1, team2 } = getTeamsForGame(game, bracket.picks || []);
                          
                          return (
                            <div key={pick.id} className="game-card">
                              <div className="pick-info">
                                <div className={game?.winnerId === team1?.id ? "team winner" 
                                  : predicted?.id === team1?.id ? "team predicted" : "team"}>
                                  <span className="seed-container">
                                    {team1?.seed}
                                  </span>
                                  <span className="logo-container">
                                    <img src={team1?.logoUrl} alt={team1?.name} className="team-logo" />
                                  </span>
                                  <span className="name-container">
                                    {team1 ? `${team1?.name}` : 'TBD'}
                                  </span>
                                  <span className="team-score">
                                    {game?.scoreTeam1 || 0}
                                  </span>
                                </div>
                                <div className={game?.winnerId === team2?.id ? "team winner" 
                                  : predicted?.id === team2?.id ? "team predicted" : "team"}>
                                  <span className="seed-container">
                                    {team2?.seed}
                                  </span>
                                  <span className="logo-container">
                                    <img src={team2?.logoUrl} alt={team2?.name} className="team-logo" />
                                  </span>
                                  <span className="name-container">
                                    {team2 ? `${team2?.name}` : 'TBD'}
                                  </span>
                                  <span className="team-score">
                                    {game?.scoreTeam2 || 0}
                                  </span>
                                </div>
                              </div>
                              {/* <div className="prediction">
                                <strong>Your Pick:</strong> {predicted?.name || 'None'}
                                {actual && (
                                  <span className={isCorrect ? 'correct' : 'incorrect'}>
                                    {isCorrect ? ' ✓' : ' ✗'}
                                  </span>
                                )}
                              </div> */}
                              {(pick.pointsEarned ?? 0) > 0 && (
                                <div className="points">+{pick.pointsEarned} points</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BracketDetailPage;

