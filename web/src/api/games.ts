import apiClient from './client';

export interface Game {
  id: string;
  round: number;
  tournamentId: string;
  gameNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  scoreTeam1: number | null;
  scoreTeam2: number | null;
  status: string;
  team1?: any;
  team2?: any;
  winner?: any;
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
};

