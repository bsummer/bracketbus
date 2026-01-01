import apiClient from './client';
import type { Team } from './teams';

export interface Game {
  id: string;
  round: number;
  tournamentId: string;
  gameNumber: number;
  region: string | null;
  parentGame1Id: string | null;
  parentGame2Id: string | null;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  scoreTeam1: number | null;
  scoreTeam2: number | null;
  status: string;
  gameDate?: string | null;
  team1?: Team | null;
  team2?: Team | null;
  winner?: Team | null;
  parentGame1?: Game | null;
  parentGame2?: Game | null;
}

export interface UpdateGameDto {
  winnerId?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  status?: string;
  gameDate?: string;
}

export interface CreateTournamentGameDto {
  round: number;
  gameNumber: number;
  region?: string;
  team1Id?: string;
  team2Id?: string;
  parentGame1Id?: string;
  parentGame2Id?: string;
  seed?: number;
  gameDate?: string;
  status?: string;
}

export interface UpdateTournamentGameDto {
  gameNumber?: number;
  region?: string;
  team1Id?: string;
  team2Id?: string;
  parentGame1Id?: string;
  parentGame2Id?: string;
  status?: string;
  gameDate?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  winnerId?: string;
}

export const gamesApi = {
  getAll: async (): Promise<Game[]> => {
    const response = await apiClient.get<Game[]>('/games');
    return response.data;
  },
  getOne: async (id: string): Promise<Game> => {
    const response = await apiClient.get<Game>(`/games/${id}`);
    return response.data;
  },
  update: async (id: string, data: UpdateGameDto): Promise<Game> => {
    const response = await apiClient.put<Game>(`/games/${id}`, data);
    return response.data;
  },
  // Tournament-specific methods
  getAllByTournament: async (
    tournamentId: string,
    round?: number,
  ): Promise<Game[]> => {
    const params = round !== undefined ? { round: round.toString() } : {};
    const response = await apiClient.get<Game[]>(
      `/tournaments/${tournamentId}/games`,
      { params },
    );
    return response.data;
  },
  createForTournament: async (
    tournamentId: string,
    data: CreateTournamentGameDto,
  ): Promise<Game> => {
    const response = await apiClient.post<Game>(
      `/tournaments/${tournamentId}/games`,
      data,
    );
    return response.data;
  },
  updateForTournament: async (
    tournamentId: string,
    id: string,
    data: UpdateTournamentGameDto,
  ): Promise<Game> => {
    const response = await apiClient.put<Game>(
      `/tournaments/${tournamentId}/games/${id}`,
      data,
    );
    return response.data;
  },
  removeFromTournament: async (
    tournamentId: string,
    id: string,
  ): Promise<void> => {
    await apiClient.delete(`/tournaments/${tournamentId}/games/${id}`);
  },
};

