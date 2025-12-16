import apiClient from './client';

export interface Team {
  id: string;
  name: string;
  seed: number;
  region: string;
  logoUrl: string;
}

export const teamsApi = {
  getAll: async (): Promise<Team[]> => {
    const response = await apiClient.get<Team[]>('/teams');
    return response.data;
  },
  getOne: async (id: string): Promise<Team> => {
    const response = await apiClient.get<Team>(`/teams/${id}`);
    return response.data;
  },
};

