import apiClient from './client';
import type { Bracket } from './brackets';

export interface Tournament {
  id: string;
  name: string;
  startDate: string;
}

export interface PoolMember {
  id: string;
  userId: string;
  poolId: string;
  status: string;
  user?: {
    id: string;
    username: string;
  };
}

export interface Pool {
  id: string;
  name: string;
  tournamentId: string;
  creatorId: string;
  inviteCode: string;
  tournament?: Tournament;
  members?: PoolMember[];
  brackets?: Bracket[];
}

export interface CreatePoolDto {
  name: string;
  tournamentId: string;
}

export interface JoinPoolDto {
  inviteCode: string;
}

export const poolsApi = {
  getAll: async (): Promise<Pool[]> => {
    const response = await apiClient.get<Pool[]>('/pools');
    return response.data;
  },
  getOne: async (id: string): Promise<Pool> => {
    const response = await apiClient.get<Pool>(`/pools/${id}`);
    return response.data;
  },
  getOnePublic: async (id: string): Promise<Pool> => {
    const response = await apiClient.get<Pool>(`/pools/${id}/public`);
    return response.data;
  },
  getByCode: async (inviteCode: string): Promise<Pool> => {
    const response = await apiClient.get<Pool>(`/pools/by-code/${encodeURIComponent(inviteCode)}`);
    return response.data;
  },
  getByName: async (name: string): Promise<Pool> => {
    const response = await apiClient.get<Pool>(`/pools/by-name/${encodeURIComponent(name)}`);
    return response.data;
  },
  create: async (data: CreatePoolDto): Promise<Pool> => {
    const response = await apiClient.post<Pool>('/pools', data);
    return response.data;
  },
  join: async (id: string, data: JoinPoolDto): Promise<Pool> => {
    const response = await apiClient.post<Pool>(`/pools/${id}/join`, data);
    return response.data;
  },
  getLeaderboard: async (id: string) => {
    const response = await apiClient.get(`/pools/${id}/leaderboard`);
    return response.data;
  },
  getMembers: async (id: string) => {
    const response = await apiClient.get(`/pools/${id}/members`);
    return response.data;
  },
  addMember: async (id: string, userId: string) => {
    const response = await apiClient.post(`/pools/${id}/members`, { userId });
    return response.data;
  },
  removeMember: async (id: string, memberId: string) => {
    await apiClient.delete(`/pools/${id}/members/${memberId}`);
  },
  getAllForAdmin: async (): Promise<Pool[]> => {
    const response = await apiClient.get<Pool[]>('/pools/admin/all');
    return response.data;
  },
};

