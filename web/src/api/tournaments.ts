import apiClient from './client';

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTournamentDto {
  name: string;
  startDate: string;
}

export interface UpdateTournamentDto {
  name?: string;
  startDate?: string;
}

export const tournamentsApi = {
  getAll: async (): Promise<Tournament[]> => {
    const response = await apiClient.get<Tournament[]>('/tournaments');
    return response.data;
  },
  getOne: async (id: string): Promise<Tournament> => {
    const response = await apiClient.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },
  create: async (data: CreateTournamentDto): Promise<Tournament> => {
    const response = await apiClient.post<Tournament>('/tournaments', data);
    return response.data;
  },
  update: async (id: string, data: UpdateTournamentDto): Promise<Tournament> => {
    const response = await apiClient.put<Tournament>(`/tournaments/${id}`, data);
    return response.data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/tournaments/${id}`);
  },
};

