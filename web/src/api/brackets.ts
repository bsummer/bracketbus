import apiClient from './client';
import type { Team } from './teams';
import type { Game } from './games';

export interface BracketPick {
  id: string;
  gameId: string;
  predictedWinnerId: string;
  game?: Game;
  predictedWinner?: Team;
  pointsEarned?: number;
}

export interface BracketPool {
  id: string;
  name: string;
  tournamentId: string;
}

export interface Bracket {
  id: string;
  name: string;
  userId: string;
  poolId: string;
  lockedAt: string | null;
  isLocked: boolean;
  created_at: Date;
  updated_at: Date;
  pool?: BracketPool;
  picks?: BracketPick[];
  user?: {
    id: string;
    username: string;
  };
}

export interface Pick {
  gameId: string;
  predictedWinnerId: string;
}

export interface CreateBracketDto {
  name: string;
  poolId: string;
  picks: Pick[];
}

export interface UpdateBracketDto {
  picks?: Pick[];
}

export const bracketsApi = {
  getAll: async (): Promise<Bracket[]> => {
    const response = await apiClient.get<Bracket[]>('/brackets');
    return response.data;
  },
  getOne: async (id: string): Promise<Bracket> => {
    const response = await apiClient.get<Bracket>(`/brackets/${id}`);
    return response.data;
  },
  create: async (data: CreateBracketDto): Promise<Bracket> => {
    const response = await apiClient.post<Bracket>('/brackets', data);
    return response.data;
  },
  update: async (id: string, data: UpdateBracketDto): Promise<Bracket> => {
    const response = await apiClient.put<Bracket>(`/brackets/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/brackets/${id}`);
  },
};

