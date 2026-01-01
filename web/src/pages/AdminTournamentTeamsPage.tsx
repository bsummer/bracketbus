import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { tournamentTeamsApi } from '../api/tournament-teams';
import { teamsApi } from '../api/teams';
import { tournamentsApi } from '../api/tournaments';
import type {
  TournamentTeam,
  CreateTournamentTeamDto,
  UpdateTournamentTeamDto,
} from '../api/tournament-teams';
import type { Team } from '../api/teams';
import type { Tournament } from '../api/tournaments';
import './AdminTournamentTeamsPage.css';

const AdminTournamentTeamsPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TournamentTeam | null>(null);
  const [formData, setFormData] = useState<{
    teamId: string;
    region: string;
    seed: number;
  }>({
    teamId: '',
    region: '',
    seed: 1,
  });
  const [formErrors, setFormErrors] = useState<{
    teamId?: string;
    region?: string;
    seed?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  const loadData = async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);
      const [tournamentData, teamsData, allTeamsData] = await Promise.all([
        tournamentsApi.getOne(tournamentId),
        tournamentTeamsApi.getAllByTournament(tournamentId),
        teamsApi.getAll(),
      ]);
      setTournament(tournamentData);
      setTeams(teamsData);
      setAllTeams(allTeamsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load tournament teams');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTeams = (): Team[] => {
    const teamIdsInTournament = new Set(teams.map((t) => t.teamId));
    return allTeams.filter((team) => {
      // If editing, allow the current team
      if (editingTeam && team.id === editingTeam.teamId) {
        return true;
      }
      // Otherwise, exclude teams already in tournament
      return !teamIdsInTournament.has(team.id);
    });
  };

  const openAddModal = () => {
    setEditingTeam(null);
    setFormData({
      teamId: '',
      region: '',
      seed: 1,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (tournamentTeam: TournamentTeam) => {
    setEditingTeam(tournamentTeam);
    setFormData({
      teamId: tournamentTeam.teamId,
      region: tournamentTeam.region,
      seed: tournamentTeam.seed,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTeam(null);
    setFormData({
      teamId: '',
      region: '',
      seed: 1,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: { teamId?: string; region?: string; seed?: string } = {};

    if (!formData.teamId) {
      errors.teamId = 'Team is required';
    }

    if (!formData.region) {
      errors.region = 'Region is required';
    }

    if (!formData.seed || formData.seed < 1 || formData.seed > 16) {
      errors.seed = 'Seed must be between 1 and 16';
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
      if (editingTeam) {
        const updateDto: UpdateTournamentTeamDto = {
          region: formData.region,
          seed: formData.seed,
        };
        await tournamentTeamsApi.update(tournamentId, editingTeam.id, updateDto);
      } else {
        const createDto: CreateTournamentTeamDto = {
          teamId: formData.teamId,
          region: formData.region,
          seed: formData.seed,
        };
        await tournamentTeamsApi.create(tournamentId, createDto);
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error('Failed to save tournament team:', err);
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      setFormErrors({
        teamId: errorMessage || 'Failed to save tournament team',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tournamentTeam: TournamentTeam) => {
    if (!tournamentId) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${tournamentTeam.team?.name || 'this team'} from the tournament?`,
    );

    if (!confirmed) return;

    try {
      setLoadingTeams(true);
      await tournamentTeamsApi.remove(tournamentId, tournamentTeam.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete tournament team:', err);
      alert('Failed to remove team from tournament');
    } finally {
      setLoadingTeams(false);
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

  const availableTeams = getAvailableTeams();

  return (
    <div>
      <Header />
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{tournament.name} - Teams</h1>
            <button
              onClick={() => navigate('/admin/tournaments')}
              className="btn btn-link back-link"
            >
              ← Back to Tournaments
            </button>
          </div>
          <div className="actions">
            <button onClick={openAddModal} className="btn">
              Add Team
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {teams.length === 0 ? (
          <div className="empty-state">
            <p>No teams added to this tournament yet.</p>
            <button onClick={openAddModal} className="btn btn-primary">
              Add Your First Team
            </button>
          </div>
        ) : (
          <div className="tournament-teams-list">
            <div className="tournament-teams-header">
              <span className="team-name">Team Name</span>
              <span className="team-region">Region</span>
              <span className="team-seed">Seed</span>
              <span className="team-actions">Actions</span>
            </div>
            {teams.map((tournamentTeam) => (
              <div className="tournament-team-item" key={tournamentTeam.id}>
                <span className="team-name">
                  {tournamentTeam.team?.name || 'Unknown Team'}
                </span>
                <span className="team-region">{tournamentTeam.region}</span>
                <span className="team-seed">{tournamentTeam.seed}</span>
                <span className="team-actions">
                  <button
                    onClick={() => openEditModal(tournamentTeam)}
                    className="btn btn-link"
                    disabled={loadingTeams}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tournamentTeam)}
                    className="btn btn-link btn-danger"
                    disabled={loadingTeams}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {editingTeam ? 'Edit Tournament Team' : 'Add Team to Tournament'}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="tournament-team-form">
                <div className="form-group">
                  <label htmlFor="teamId">
                    Team <span className="required">*</span>
                  </label>
                  <select
                    id="teamId"
                    value={formData.teamId}
                    onChange={(e) =>
                      setFormData({ ...formData, teamId: e.target.value })
                    }
                    required
                    disabled={submitting || !!editingTeam}
                    className={formErrors.teamId ? 'error' : ''}
                  >
                    <option value="">Select a team</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.teamId && (
                    <span className="field-error">{formErrors.teamId}</span>
                  )}
                  {editingTeam && (
                    <small>Team cannot be changed when editing</small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="region">
                    Region <span className="required">*</span>
                  </label>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
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
                  <label htmlFor="seed">
                    Seed <span className="required">*</span>
                  </label>
                  <select
                    id="seed"
                    value={formData.seed}
                    onChange={(e) =>
                      setFormData({ ...formData, seed: parseInt(e.target.value, 10) })
                    }
                    required
                    disabled={submitting}
                    className={formErrors.seed ? 'error' : ''}
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((seed) => (
                      <option key={seed} value={seed}>
                        {seed}
                      </option>
                    ))}
                  </select>
                  {formErrors.seed && (
                    <span className="field-error">{formErrors.seed}</span>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting
                      ? editingTeam
                        ? 'Updating...'
                        : 'Adding...'
                      : editingTeam
                        ? 'Update Team'
                        : 'Add Team'}
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

export default AdminTournamentTeamsPage;

