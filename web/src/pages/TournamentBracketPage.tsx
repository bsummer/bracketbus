import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import HeaderPublic from '../components/common/HeaderPublic';
import { tournamentsApi } from '../api/tournaments';
import { gamesApi } from '../api/games';
import apiClient from '../api/client';
import type { Tournament } from '../api/tournaments';
import type { Game } from '../api/games';
import type { Team } from '../api/teams';
import './TournamentBracketPage.css';

const TournamentBracketPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { isAuthenticated } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tournamentData, gamesData] = await Promise.all([
        tournamentsApi.getOne(tournamentId!),
        gamesApi.getAllByTournament(tournamentId!),
      ]);
      setTournament(tournamentData);
      setGames(gamesData.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));
    } catch (error) {
      console.error('Failed to load tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamsForGame = (game: Game, allGames: Game[]): { team1: Team | null; team2: Team | null } => {
    if (!game) {
      return { team1: null, team2: null };
    }

    // Round 1 games have teams populated directly
    if (game.round === 1) {
      return {
        team1: game.team1 ?? null,
        team2: game.team2 ?? null,
      };
    }

    // For Round 2+, get teams from parent game winners
    // If parent games are loaded, use them; otherwise find in allGames
    let team1: Team | null = null;
    let team2: Team | null = null;

    if (game.parentGame1) {
      team1 = game.parentGame1.winner ?? null;
    } else if (game.parentGame1Id) {
      const parentGame1 = allGames.find((g) => g.id === game.parentGame1Id);
      if (parentGame1?.winner) {
        team1 = parentGame1.winner;
      }
    }

    if (game.parentGame2) {
      team2 = game.parentGame2.winner ?? null;
    } else if (game.parentGame2Id) {
      const parentGame2 = allGames.find((g) => g.id === game.parentGame2Id);
      if (parentGame2?.winner) {
        team2 = parentGame2.winner;
      }
    }

    return { team1, team2 };
  };

  const handleDownloadImage = async () => {
    if (!tournament || pdfGenerating || !tournamentId) return;

    try {
      setPdfGenerating(true);
      console.log('Requesting bracket image from server...');

      // Request image from server endpoint
      const response = await apiClient.get(`/tournaments/${tournamentId}/bracket-image`, {
        responseType: 'blob',
      });

      console.log('Bracket image received from server', { blobSize: response.data.size });

      // Create download link
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tournament.name.replace(/\s+/g, '_')}_Bracket.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Bracket image download completed');
    } catch (error) {
      console.error('Failed to generate bracket image:', error);
      alert(`Failed to generate bracket image: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the browser console for details.`);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div>
        {isAuthenticated ? <Header /> : <HeaderPublic />}
        <div className="page">Loading...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div>
        {isAuthenticated ? <Header /> : <HeaderPublic />}
        <div className="page">Tournament not found</div>
      </div>
    );
  }

  // Group games by region and round
  const gamesByRegionAndRound = games.reduce((acc: Record<string, Record<number, Game[]>>, game: Game) => {
    const round = game.round || 0;
    
    // For rounds 1-4, group by region
    // For rounds 5-6 (Final Four, Championship), use 'center'
    let region = 'center';
    if (round <= 4 && game.region) {
      region = game.region;
    }
    
    if (!acc[region]) acc[region] = {};
    if (!acc[region][round]) acc[region][round] = [];
    acc[region][round].push(game);
    return acc;
  }, {});

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

  return (
    <div>
      {isAuthenticated ? <Header /> : <HeaderPublic />}
      <div className="page">
        <div className="bracket-header">
          <h1>{tournament.name}</h1>
          <div className="bracket-info">
            <p>Start Date: {new Date(tournament.startDate).toLocaleDateString()}</p>
            <button 
              onClick={handleDownloadImage} 
              className="btn btn-primary" 
              style={{ marginRight: '10px' }}
              disabled={pdfGenerating}
            >
              {pdfGenerating ? 'Generating Image...' : 'Download Image'}
            </button>
            <Link to="/tournaments" className="btn btn-link">
              ← Back to Tournaments
            </Link>
          </div>
        </div>

        <div className="bracket-accordion">
          {sortedRegions.map(([region, gamesByRound]) => {
            const isExpanded = expandedRegions.has(region);
            const isCenter = region === 'center';
            const regionDisplayName = isCenter ? 'Semis and Finals' : `${region} Region`;
            
            return (
              <div key={region} className="accordion-item">
                <button
                  className="accordion-header"
                  onClick={() => toggleRegion(region)}
                >
                  <span className={`accordion-arrow ${isExpanded ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <span className="accordion-title">{regionDisplayName}</span>
                </button>
                {isExpanded && (
                  <div className="accordion-content">
                    <div className={`bracket-region ${isCenter ? 'round-center' : ''}`}>
                      {Object.entries(gamesByRound)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([round, regionGames]) => (
                          <div key={round} className={`round-container round-${round} ${isCenter ? 'round-center' : ''}`}>
                            {isCenter && (
                              <h3 className="round-title">
                                {Number(round) === 5 ? 'Final Four' : Number(round) === 6 ? 'Championship' : `Round ${round}`}
                              </h3>
                            )}
                            <div className={`games-list ${isCenter ? 'games-center' : ''}`}>
                              {regionGames
                                .sort((a, b) => a.gameNumber - b.gameNumber)
                                .map((game) => {
                                  const { team1, team2 } = getTeamsForGame(game, games);
                                  
                                  return (
                                    <div key={game.id} className="game-card">
                                      <div className="game-info">
                                        Game {game.gameNumber} - Round {game.round}
                                      </div>
                                      <div className="pick-info">
                                        <div className={game.winnerId === team1?.id ? "team winner" : "team"}>
                                          <span className="seed-container">
                                            {team1 && 'seed' in team1 ? (team1 as any).seed : ''}
                                          </span>
                                          <span className="logo-container">
                                            {team1?.logoUrl && (
                                              <img src={team1.logoUrl} alt={team1.name} className="team-logo" />
                                            )}
                                          </span>
                                          <span className="name-container">
                                            {team1 ? team1.name : 'TBD'}
                                          </span>
                                          <span className="team-score">
                                            {game.scoreTeam1 ?? ''}
                                          </span>
                                        </div>
                                        <div className={game.winnerId === team2?.id ? "team winner" : "team"}>
                                          <span className="seed-container">
                                            {team2 && 'seed' in team2 ? (team2 as any).seed : ''}
                                          </span>
                                          <span className="logo-container">
                                            {team2?.logoUrl && (
                                              <img src={team2.logoUrl} alt={team2.name} className="team-logo" />
                                            )}
                                          </span>
                                          <span className="name-container">
                                            {team2 ? team2.name : 'TBD'}
                                          </span>
                                          <span className="team-score">
                                            {game.scoreTeam2 ?? ''}
                                          </span>
                                        </div>
                                      </div>
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
      </div>
    </div>
  );
};

export default TournamentBracketPage;

