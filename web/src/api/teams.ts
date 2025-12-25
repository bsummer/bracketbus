import apiClient from './client';

export interface Team {
  id: string;
  name: string;
  seed?: number; // Optional - only present when team is in context of a tournament
  region?: string; // Optional - only present when team is in context of a tournament
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

