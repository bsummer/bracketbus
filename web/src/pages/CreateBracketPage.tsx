import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { bracketsApi } from '../api/brackets';
import { poolsApi } from '../api/pools';
import type { Pool } from '../api/pools';
import { gamesApi } from '../api/games';
import { teamsApi } from '../api/teams';
import type { Game } from '../api/games';
import type { Team } from '../api/teams';
import './CreateBracketPage.css';

const CreateBracketPage = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [poolId, setPoolId] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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
      const [poolsData, gamesData, teamsData] = await Promise.all([
        poolsApi.getAll(),
        gamesApi.getAll(),
        teamsApi.getAll(),
      ]);
      setPools(poolsData);
      setGames(gamesData.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));
      setTeams(teamsData);
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
      const [poolsData, allGamesData, teamsData] = await Promise.all([
        poolsApi.getAll(),
        gamesApi.getAll(),
        teamsApi.getAll(),
      ]);

      // Filter games by tournamentId
      const tournamentGames = allGamesData.filter(
        (game) => game.tournamentId === tournamentId
      );

      setPools(poolsData);
      setGames(tournamentGames.sort((a, b) => a.round - b.round || a.gameNumber - b.gameNumber));
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load pool and games:', error);
      // Fallback to loading all data
      loadData();
    }
  };

  const handlePick = (gameId: string, teamId: string) => {
    setPicks({ ...picks, [gameId]: teamId });
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

  const getTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId);
  };

  const gamesByRound = games.reduce((acc, game) => {
    if (!acc[game.round]) acc[game.round] = [];
    acc[game.round].push(game);
    return acc;
  }, {} as { [round: number]: Game[] });

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
                    const team1 = getTeam(game.team1Id);
                    const team2 = getTeam(game.team2Id);
                    const selectedTeamId = picks[game.id];

                    return (
                      <div key={game.id} className="game-card">
                        <div className="game-header">Game {game.gameNumber}</div>
                        <div className="teams">
                          <button
                            type="button"
                            className={`team-btn ${selectedTeamId === game.team1Id ? 'selected' : ''}`}
                            onClick={() => handlePick(game.id, game.team1Id!)}
                            disabled={!game.team1Id}
                          >
                            {team1 ? `${team1.name} (#${team1.seed})` : 'TBD'}
                          </button>
                          <div className="vs">vs</div>
                          <button
                            type="button"
                            className={`team-btn ${selectedTeamId === game.team2Id ? 'selected' : ''}`}
                            onClick={() => handlePick(game.id, game.team2Id!)}
                            disabled={!game.team2Id}
                          >
                            {team2 ? `${team2.name} (#${team2.seed})` : 'TBD'}
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

