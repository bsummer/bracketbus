import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { gamesApi } from '../api/games';
import { tournamentsApi } from '../api/tournaments';
import { tournamentTeamsApi } from '../api/tournament-teams';
import type {
  Game,
  CreateTournamentGameDto,
  UpdateTournamentGameDto,
} from '../api/games';
import type { Tournament } from '../api/tournaments';
import type { TournamentTeam } from '../api/tournament-teams';
import './AdminTournamentGamesPage.css';

const AdminTournamentGamesPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<CreateTournamentGameDto>({
    round: 1,
    gameNumber: 1,
    region: '',
    team1Id: '',
    team2Id: '',
    parentGame1Id: '',
    parentGame2Id: '',
    gameDate: '',
    status: 'scheduled',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId, selectedRound]);

  const loadData = async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);
      const [tournamentData, teamsData] = await Promise.all([
        tournamentsApi.getOne(tournamentId),
        tournamentTeamsApi.getAllByTournament(tournamentId),
      ]);
      setTournament(tournamentData);
      setTournamentTeams(teamsData);
      await loadGames();
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load tournament games');
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async () => {
    if (!tournamentId) return;

    try {
      const gamesData = await gamesApi.getAllByTournament(
        tournamentId,
        selectedRound || undefined,
      );
      setGames(gamesData);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load games');
    }
  };

  const getGamesForRound = (round: number): Game[] => {
    return games.filter((g) => g.round === round);
  };

  const getMaxRound = (): number => {
    if (games.length === 0) return 1;
    return Math.max(...games.map((g) => g.round));
  };

  const openAddModal = (round?: number) => {
    setEditingGame(null);
    const defaultRound = round || selectedRound || 1;
    setFormData({
      round: defaultRound,
      gameNumber: 1,
      region: '',
      team1Id: '',
      team2Id: '',
      parentGame1Id: '',
      parentGame2Id: '',
      gameDate: '',
      status: 'scheduled',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (game: Game) => {
    setEditingGame(game);
    setFormData({
      round: game.round,
      gameNumber: game.gameNumber,
      region: game.region || '',
      team1Id: game.team1Id || '',
      team2Id: game.team2Id || '',
      parentGame1Id: game.parentGame1Id || '',
      parentGame2Id: game.parentGame2Id || '',
      gameDate: game.gameDate ? game.gameDate.split('T')[0] : '',
      status: game.status,
    });
    setFormErrors({});
    
    // If editing a Round 2+ game, ensure we have games from the previous round loaded
    if (game.round > 1 && tournamentId) {
      const previousRoundGames = games.filter((g) => g.round === game.round - 1);
      // If we don't have previous round games loaded, load them
      if (previousRoundGames.length === 0) {
        try {
          const allGames = await gamesApi.getAllByTournament(tournamentId);
          setGames(allGames);
        } catch (err) {
          console.error('Failed to load all games for edit:', err);
        }
      }
    }
    
    setShowModal(true);
  };

  const closeModal = async () => {
    setShowModal(false);
    setEditingGame(null);
    setFormData({
      round: 1,
      gameNumber: 1,
      region: '',
      team1Id: '',
      team2Id: '',
      parentGame1Id: '',
      parentGame2Id: '',
      gameDate: '',
      status: 'scheduled',
    });
    setFormErrors({});
    
    // Reload games with the current round filter to restore the filtered view
    await loadGames();
  };

  const getTeamsForRegion = (region: string): TournamentTeam[] => {
    return tournamentTeams.filter((tt) => tt.region === region);
  };

  const getGamesForPreviousRound = (round: number): Game[] => {
    if (round <= 1) return [];
    return games.filter((g) => g.round === round - 1);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.round || formData.round < 1) {
      errors.round = 'Round is required and must be at least 1';
    }

    if (!formData.gameNumber || formData.gameNumber < 1) {
      errors.gameNumber = 'Game number is required and must be at least 1';
    }

    if (formData.round === 1) {
      // Round 1 validation
      if (!formData.region) {
        errors.region = 'Region is required for Round 1';
      }
      if (!formData.team1Id) {
        errors.team1Id = 'Team 1 is required';
      }
      if (!formData.team2Id) {
        errors.team2Id = 'Team 2 is required';
      }
      if (formData.team1Id && formData.team2Id && formData.team1Id === formData.team2Id) {
        errors.team2Id = 'Team 1 and Team 2 must be different';
      }
    } else {
      // Round 2+ validation
      if (!formData.parentGame1Id) {
        errors.parentGame1Id = 'Parent Game 1 is required';
      }
      if (!formData.parentGame2Id) {
        errors.parentGame2Id = 'Parent Game 2 is required';
      }
      if (
        formData.parentGame1Id &&
        formData.parentGame2Id &&
        formData.parentGame1Id === formData.parentGame2Id
      ) {
        errors.parentGame2Id = 'Parent Game 1 and Parent Game 2 must be different';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!validateForm() || !tournamentId) {
      return;
    }

    setSubmitting(true);

    try {
      if (editingGame) {
        const updateData: UpdateTournamentGameDto = {
          gameNumber: formData.gameNumber,
          gameDate: formData.gameDate || undefined,
          status: formData.status,
        };

        if (formData.round === 1) {
          updateData.region = formData.region;
          updateData.team1Id = formData.team1Id;
          updateData.team2Id = formData.team2Id;
        } else {
          updateData.parentGame1Id = formData.parentGame1Id;
          updateData.parentGame2Id = formData.parentGame2Id;
          if (formData.region) {
            updateData.region = formData.region;
          }
        }

        await gamesApi.updateForTournament(tournamentId, editingGame.id, updateData);
      } else {
        const createData: CreateTournamentGameDto = {
          round: formData.round,
          gameNumber: formData.gameNumber,
          gameDate: formData.gameDate || undefined,
          status: formData.status,
        };

        if (formData.round === 1) {
          createData.region = formData.region;
          createData.team1Id = formData.team1Id;
          createData.team2Id = formData.team2Id;
        } else {
          createData.parentGame1Id = formData.parentGame1Id;
          createData.parentGame2Id = formData.parentGame2Id;
          if (formData.region) {
            createData.region = formData.region;
          }
        }

        await gamesApi.createForTournament(tournamentId, createData);
      }
      await closeModal();
    } catch (err) {
      console.error('Failed to save game:', err);
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setFormErrors({
        submit: errorMessage || 'Failed to save game',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (game: Game) => {
    if (!tournamentId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete Game ${game.gameNumber} (Round ${game.round})?`,
    );

    if (!confirmed) return;

    try {
      await gamesApi.removeFromTournament(tournamentId, game.id);
      await loadGames();
    } catch (err) {
      console.error('Failed to delete game:', err);
      alert('Failed to delete game');
    }
  };

  const formatTeamName = (game: Game, teamNumber: 1 | 2): string => {
    const team = teamNumber === 1 ? game.team1 : game.team2;
    if (!team) return 'TBD';
    const tournamentTeam = tournamentTeams.find((tt) => tt.teamId === team.id);
    if (tournamentTeam) {
      return `Seed ${tournamentTeam.seed} - ${team.name}`;
    }
    return team.name;
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="page">Loading...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div>
        <Header />
        <div className="page">
          <div className="error-message">Tournament not found</div>
        </div>
      </div>
    );
  }

  const maxRound = getMaxRound();

  return (
    <div>
      <Header />
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{tournament.name} - Games</h1>
            <button
              onClick={() => navigate('/admin/tournaments')}
              className="btn btn-link back-link"
            >
              ← Back to Tournaments
            </button>
          </div>
          <div className="actions">
            <button onClick={() => openAddModal()} className="btn">
              Add Game
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}

        {/* Round Filter Tabs */}
        <div className="round-tabs">
          <button
            className={`round-tab ${selectedRound === null ? 'active' : ''}`}
            onClick={() => setSelectedRound(null)}
          >
            All Rounds
          </button>
          {Array.from({ length: Math.max(maxRound, 6) }, (_, i) => i + 1).map((round) => {
            const roundGames = getGamesForRound(round);
            return (
              <button
                key={round}
                className={`round-tab ${selectedRound === round ? 'active' : ''}`}
                onClick={() => setSelectedRound(round)}
              >
                Round {round} {roundGames.length > 0 && `(${roundGames.length})`}
              </button>
            );
          })}
        </div>

        {/* Games Table */}
        {games.length === 0 ? (
          <div className="empty-state">
            <p>No games found for this tournament.</p>
            <button onClick={() => openAddModal(1)} className="btn btn-primary">
              Add Your First Game
            </button>
          </div>
        ) : (
          <div className="games-list">
            <div className="games-header">
              <span className="game-round">Round</span>
              <span className="game-number">Game #</span>
              <span className="game-region">Region</span>
              <span className="game-team1">Team 1</span>
              <span className="game-team2">Team 2</span>
              <span className="game-status">Status</span>
              <span className="game-actions">Actions</span>
            </div>
            {games.map((game) => (
              <div className="game-item" key={game.id}>
                <span className="game-round">{game.round}</span>
                <span className="game-number">{game.gameNumber}</span>
                <span className="game-region">{game.region || '-'}</span>
                <span className="game-team1">{formatTeamName(game, 1)}</span>
                <span className="game-team2">{formatTeamName(game, 2)}</span>
                <span className="game-status">{game.status}</span>
                <span className="game-actions">
                  <button
                    onClick={() => openEditModal(game)}
                    className="btn btn-link"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(game)}
                    className="btn btn-link btn-danger"
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Game Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingGame ? 'Edit Game' : 'Add Game to Tournament'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="tournament-game-form">
                {formErrors.submit && (
                  <div className="error-message">{formErrors.submit}</div>
                )}

                <div className="form-group">
                  <label htmlFor="round">
                    Round <span className="required">*</span>
                  </label>
                  <input
                    id="round"
                    type="number"
                    min="1"
                    value={formData.round}
                    onChange={(e) =>
                      setFormData({ ...formData, round: parseInt(e.target.value, 10) })
                    }
                    required
                    disabled={submitting || formData.round === 1}
                    className={formErrors.round ? 'error' : ''}
                  />
                  {formErrors.round && (
                    <span className="field-error">{formErrors.round}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="gameNumber">
                    Game Number <span className="required">*</span>
                  </label>
                  <input
                    id="gameNumber"
                    type="number"
                    min="1"
                    value={formData.gameNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gameNumber: parseInt(e.target.value, 10),
                      })
                    }
                    required
                    disabled={submitting}
                    className={formErrors.gameNumber ? 'error' : ''}
                  />
                  {formErrors.gameNumber && (
                    <span className="field-error">{formErrors.gameNumber}</span>
                  )}
                </div>

                {formData.round === 1 ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="region">
                        Region <span className="required">*</span>
                      </label>
                      <select
                        id="region"
                        value={formData.region}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            region: e.target.value,
                            team1Id: '',
                            team2Id: '',
                          });
                        }}
                        required
                        disabled={submitting}
                        className={formErrors.region ? 'error' : ''}
                      >
                        <option value="">Select a region</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                        <option value="Midwest">Midwest</option>
                      </select>
                      {formErrors.region && (
                        <span className="field-error">{formErrors.region}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="team1Id">
                        Team 1 <span className="required">*</span>
                      </label>
                      <select
                        id="team1Id"
                        value={formData.team1Id}
                        onChange={(e) =>
                          setFormData({ ...formData, team1Id: e.target.value })
                        }
                        required
                        disabled={submitting || !formData.region}
                        className={formErrors.team1Id ? 'error' : ''}
                      >
                        <option value="">Select Team 1</option>
                        {formData.region &&
                          getTeamsForRegion(formData.region).map((tt) => (
                            <option key={tt.id} value={tt.teamId}>
                              Seed {tt.seed} - {tt.team?.name || 'Unknown'}
                            </option>
                          ))}
                      </select>
                      {formErrors.team1Id && (
                        <span className="field-error">{formErrors.team1Id}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="team2Id">
                        Team 2 <span className="required">*</span>
                      </label>
                      <select
                        id="team2Id"
                        value={formData.team2Id}
                        onChange={(e) =>
                          setFormData({ ...formData, team2Id: e.target.value })
                        }
                        required
                        disabled={submitting || !formData.region}
                        className={formErrors.team2Id ? 'error' : ''}
                      >
                        <option value="">Select Team 2</option>
                        {formData.region &&
                          getTeamsForRegion(formData.region)
                            .filter((tt) => tt.teamId !== formData.team1Id)
                            .map((tt) => (
                              <option key={tt.id} value={tt.teamId}>
                                Seed {tt.seed} - {tt.team?.name || 'Unknown'}
                              </option>
                            ))}
                      </select>
                      {formErrors.team2Id && (
                        <span className="field-error">{formErrors.team2Id}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="region">Region (Optional)</label>
                      <select
                        id="region"
                        value={formData.region}
                        onChange={(e) =>
                          setFormData({ ...formData, region: e.target.value })
                        }
                        disabled={submitting}
                      >
                        <option value="">None</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                        <option value="Midwest">Midwest</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="parentGame1Id">
                        Parent Game 1 <span className="required">*</span>
                      </label>
                      <select
                        id="parentGame1Id"
                        value={formData.parentGame1Id}
                        onChange={(e) =>
                          setFormData({ ...formData, parentGame1Id: e.target.value })
                        }
                        required
                        disabled={submitting}
                        className={formErrors.parentGame1Id ? 'error' : ''}
                      >
                        <option value="">Select Parent Game 1</option>
                        {getGamesForPreviousRound(formData.round).map((game) => (
                          <option key={game.id} value={game.id}>
                            Game {game.gameNumber} - Round {game.round}
                          </option>
                        ))}
                      </select>
                      {formErrors.parentGame1Id && (
                        <span className="field-error">{formErrors.parentGame1Id}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="parentGame2Id">
                        Parent Game 2 <span className="required">*</span>
                      </label>
                      <select
                        id="parentGame2Id"
                        value={formData.parentGame2Id}
                        onChange={(e) =>
                          setFormData({ ...formData, parentGame2Id: e.target.value })
                        }
                        required
                        disabled={submitting}
                        className={formErrors.parentGame2Id ? 'error' : ''}
                      >
                        <option value="">Select Parent Game 2</option>
                        {getGamesForPreviousRound(formData.round)
                          .filter((game) => game.id !== formData.parentGame1Id)
                          .map((game) => (
                            <option key={game.id} value={game.id}>
                              Game {game.gameNumber} - Round {game.round}
                            </option>
                          ))}
                      </select>
                      {formErrors.parentGame2Id && (
                        <span className="field-error">{formErrors.parentGame2Id}</span>
                      )}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="gameDate">Game Date (Optional)</label>
                  <input
                    id="gameDate"
                    type="date"
                    value={formData.gameDate}
                    onChange={(e) =>
                      setFormData({ ...formData, gameDate: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    disabled={submitting}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting
                      ? editingGame
                        ? 'Updating...'
                        : 'Adding...'
                      : editingGame
                        ? 'Update Game'
                        : 'Add Game'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTournamentGamesPage;

