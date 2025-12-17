import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../api/games';
import type { Game } from '../api/games';
import styles from './GamesListPage.module.css';

export const GamesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await gamesApi.getAll();
      setGames(data);
    } catch (err: any) {
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.completed;
      case 'in_progress':
        return styles.inProgress;
      default:
        return styles.scheduled;
    }
  };

  const gamesByRound = games.reduce((acc, game) => {
    if (!acc[game.round]) {
      acc[game.round] = [];
    }
    acc[game.round].push(game);
    return acc;
  }, {} as Record<number, Game[]>);

  if (loading) {
    return (
      <div className={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin - Manage Games</h1>
        <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {Object.entries(gamesByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, roundGames]) => (
            <div key={round} className={styles.roundSection}>
              <h2 className={styles.roundTitle}>Round {round}</h2>
              <div className={styles.gamesGrid}>
                {roundGames
                  .sort((a, b) => a.gameNumber - b.gameNumber)
                  .map((game) => (
                    <div
                      key={game.id}
                      className={styles.gameCard}
                      onClick={() => navigate(`/admin/games/${game.id}`)}
                    >
                      <div className={styles.gameHeader}>
                        <span className={styles.gameNumber}>Game {game.gameNumber}</span>
                        <span className={`${styles.status} ${getStatusColor(game.status)}`}>
                          {game.status}
                        </span>
                      </div>
                      <div className={styles.teams}>
                        {game.team1 ? (
                          <div
                            className={`${styles.team} ${
                              game.winnerId === game.team1.id ? styles.winner : ''
                            }`}
                          >
                            <span className={styles.seed}>({game.team1.seed})</span>
                            <span className={styles.teamName}>{game.team1.name}</span>
                            {game.scoreTeam1 !== null && (
                              <span className={styles.score}>{game.scoreTeam1}</span>
                            )}
                          </div>
                        ) : (
                          <div className={styles.team}>
                            <span className={styles.teamName}>TBD</span>
                          </div>
                        )}
                        <div className={styles.vs}>vs</div>
                        {game.team2 ? (
                          <div
                            className={`${styles.team} ${
                              game.winnerId === game.team2.id ? styles.winner : ''
                            }`}
                          >
                            <span className={styles.seed}>({game.team2.seed})</span>
                            <span className={styles.teamName}>{game.team2.name}</span>
                            {game.scoreTeam2 !== null && (
                              <span className={styles.score}>{game.scoreTeam2}</span>
                            )}
                          </div>
                        ) : (
                          <div className={styles.team}>
                            <span className={styles.teamName}>TBD</span>
                          </div>
                        )}
                      </div>
                      {game.winnerId && game.team1 && game.team2 && (
                        <div className={styles.winnerBadge}>
                          Winner: {game.winnerId === game.team1.id ? game.team1.name : game.team2.name}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default GamesListPage;

