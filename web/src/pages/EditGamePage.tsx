import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../api/games';
import type { Game, UpdateGameDto } from '../api/games';
import styles from './EditGamePage.module.css';

export const EditGamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [winnerId, setWinnerId] = useState<string>('');
  const [scoreTeam1, setScoreTeam1] = useState<string>('');
  const [scoreTeam2, setScoreTeam2] = useState<string>('');
  const [status, setStatus] = useState<string>('scheduled');
  const [gameDate, setGameDate] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadGame();
    }
  }, [id]);

  const loadGame = async () => {
    try {
      const gameData = await gamesApi.getOne(id!);
      setGame(gameData);
      setWinnerId(gameData.winnerId || '');
      setScoreTeam1(gameData.scoreTeam1?.toString() || '');
      setScoreTeam2(gameData.scoreTeam2?.toString() || '');
      setStatus(gameData.status);
      setGameDate(gameData.gameDate ? new Date(gameData.gameDate).toISOString().slice(0, 16) : '');
    } catch (err: any) {
      setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !game) return;

    setError(null);
    setSaving(true);

    try {
      const updateData: UpdateGameDto = {
        winnerId: winnerId || undefined,
        scoreTeam1: scoreTeam1 ? parseInt(scoreTeam1, 10) : undefined,
        scoreTeam2: scoreTeam2 ? parseInt(scoreTeam2, 10) : undefined,
        status: status || undefined,
        gameDate: gameDate || undefined,
      };

      await gamesApi.update(id, updateData);
      navigate('/admin/games');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Game not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Edit Game {game.gameNumber} - Round {game.round}</h1>
        <button 
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => navigate('/admin/games')}
        >
          Back to Games
        </button>
      </header>

      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.gameInfo}>
          <div className={styles.teamsDisplay}>
            {game.team1 ? (
              <div className={styles.teamCard}>
                <div className={styles.teamHeader}>Team 1</div>
                <div className={styles.teamInfo}>
                  <span className={styles.seed}>({game.team1.seed})</span>
                  <span className={styles.teamName}>{game.team1.name}</span>
                </div>
              </div>
            ) : (
              <div className={styles.teamCard}>
                <div className={styles.teamHeader}>Team 1</div>
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>TBD</span>
                </div>
              </div>
            )}
            <div className={styles.vs}>vs</div>
            {game.team2 ? (
              <div className={styles.teamCard}>
                <div className={styles.teamHeader}>Team 2</div>
                <div className={styles.teamInfo}>
                  <span className={styles.seed}>({game.team2.seed})</span>
                  <span className={styles.teamName}>{game.team2.name}</span>
                </div>
              </div>
            ) : (
              <div className={styles.teamCard}>
                <div className={styles.teamHeader}>Team 2</div>
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>TBD</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Game Details</h2>

          {game.team1 && game.team2 && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Winner</label>
                  <select
                    className={styles.select}
                    value={winnerId}
                    onChange={(e) => setWinnerId(e.target.value)}
                  >
                    <option value="">No winner selected</option>
                    <option value={game.team1.id}>
                      ({game.team1.seed}) {game.team1.name}
                    </option>
                    <option value={game.team2.id}>
                      ({game.team2.seed}) {game.team2.name}
                    </option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{game.team1.name} Score</label>
                  <input
                    type="number"
                    value={scoreTeam1}
                    onChange={(e) => setScoreTeam1(e.target.value)}
                    min="0"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{game.team2.name} Score</label>
                  <input
                    type="number"
                    value={scoreTeam2}
                    onChange={(e) => setScoreTeam2(e.target.value)}
                    min="0"
                    className={styles.input}
                  />
                </div>
              </div>
            </>
          )}
          {(!game.team1 || !game.team2) && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <p className={styles.infoText}>
                  Teams for this game will be determined by the winners of parent games.
                </p>
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Game Date & Time</label>
              <input
                type="datetime-local"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => navigate('/admin/games')}
            >
              Cancel
            </button>
            <button 
              className={styles.button}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGamePage;