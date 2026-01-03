import apiClient from './client';
import type { Team } from './teams';

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  teamId: string;
  region: string;
  seed: number;
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTournamentTeamDto {
  teamId: string;
  region: string;
  seed: number;
}

export interface UpdateTournamentTeamDto {
  region?: string;
  seed?: number;
}

export const tournamentTeamsApi = {
  getAllByTournament: async (tournamentId: string): Promise<TournamentTeam[]> => {
    const response = await apiClient.get<TournamentTeam[]>(
      `/tournaments/${tournamentId}/teams`,
    );
    return response.data;
  },
  getOne: async (tournamentId: string, id: string): Promise<TournamentTeam> => {
    const response = await apiClient.get<TournamentTeam>(
      `/tournaments/${tournamentId}/teams/${id}`,
    );
    return response.data;
  },
  create: async (
    tournamentId: string,
    data: CreateTournamentTeamDto,
  ): Promise<TournamentTeam> => {
    const response = await apiClient.post<TournamentTeam>(
      `/tournaments/${tournamentId}/teams`,
      data,
    );
    return response.data;
  },
  update: async (
    tournamentId: string,
    id: string,
    data: UpdateTournamentTeamDto,
  ): Promise<TournamentTeam> => {
    const response = await apiClient.put<TournamentTeam>(
      `/tournaments/${tournamentId}/teams/${id}`,
      data,
    );
    return response.data;
  },
  remove: async (tournamentId: string, id: string): Promise<void> => {
    await apiClient.delete(`/tournaments/${tournamentId}/teams/${id}`);
  },
};

