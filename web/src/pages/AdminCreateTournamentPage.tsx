import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { tournamentsApi } from '../api/tournaments';
import type { CreateTournamentDto, UpdateTournamentDto } from '../api/tournaments';
import './AdminCreateTournamentPage.css';

const AdminCreateTournamentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    startDate?: string;
  }>({});

  useEffect(() => {
    if (isEditMode && id) {
      loadTournament(id);
    }
  }, [isEditMode, id]);

  const loadTournament = async (tournamentId: string) => {
    try {
      setLoadingData(true);
      setError(null);
      const tournament = await tournamentsApi.getOne(tournamentId);
      setName(tournament.name);
      // Format date for input (YYYY-MM-DD)
      const date = new Date(tournament.startDate);
      const formattedDate = date.toISOString().split('T')[0];
      setStartDate(formattedDate);
    } catch (err) {
      console.error('Failed to load tournament:', err);
      setError('Failed to load tournament');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; startDate?: string } = {};

    if (!name.trim()) {
      errors.name = 'Tournament name is required';
    }

    if (!startDate) {
      errors.startDate = 'Start date is required';
    } else {
      const selectedDate = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selectedDate.getTime())) {
        errors.startDate = 'Please enter a valid date';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && id) {
        const updateTournamentDto: UpdateTournamentDto = {
          name: name.trim(),
          startDate,
        };
        await tournamentsApi.update(id, updateTournamentDto);
      } else {
        const createTournamentDto: CreateTournamentDto = {
          name: name.trim(),
          startDate,
        };
        await tournamentsApi.create(createTournamentDto);
      }
      navigate('/admin/tournaments');
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} tournament:`, err);
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      setError(errorMessage || `Failed to ${isEditMode ? 'update' : 'create'} tournament`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div>
        <Header />
        <div className="page">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="page">
        <h1>{isEditMode ? 'Edit Tournament' : 'Create New Tournament'}</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="admin-create-tournament-form">
          <div className="form-group">
            <label htmlFor="name">
              Tournament Name <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className={fieldErrors.name ? 'error' : ''}
            />
            {fieldErrors.name && (
              <span className="field-error">{fieldErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="startDate">
              Start Date <span className="required">*</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={loading}
              className={fieldErrors.startDate ? 'error' : ''}
            />
            {fieldErrors.startDate && (
              <span className="field-error">{fieldErrors.startDate}</span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Tournament'
                  : 'Create Tournament'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/tournaments')}
              disabled={loading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCreateTournamentPage;

