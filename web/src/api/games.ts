import apiClient from './client';

export interface Game {
  id: string;
  round: number;
  tournamentId: string;
  gameNumber: number;
  parentGame1Id: string | null;
  parentGame2Id: string | null;
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

export interface UpdateGameDto {
  winnerId?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  status?: string;
  gameDate?: string;
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
};

