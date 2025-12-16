import apiClient from './client';

export interface Bracket {
  id: string;
  name: string;
  userId: string;
  poolId: string;
  lockedAt: string | null;
  pool?: any;
  picks?: any[];
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

