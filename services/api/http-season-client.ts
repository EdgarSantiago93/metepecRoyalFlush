import type { User } from '@/types';
import { apiFetch, ApiError } from './http-auth-client';
import type {
  CreateSeasonRequest,
  CreateSeasonResponse,
  EndSeasonRequest,
  EndSeasonResponse,
  GetActiveSeasonResponse,
  GetUsersResponse,
  StartSeasonResponse,
  UpdateTreasurerRequest,
  UpdateTreasurerResponse,
} from './types';

export const httpSeason = {
  async getActiveSeason(): Promise<GetActiveSeasonResponse> {
    try {
      return await apiFetch<GetActiveSeasonResponse>('/seasons/active');
    } catch (err) {
      // 404 means no active season — valid state, not an error
      if (err instanceof ApiError && err.status === 404) {
        return { season: null, members: [] };
      }
      throw err;
    }
  },

  async getUsers(): Promise<GetUsersResponse> {
    // Backend returns User[] (unwrapped from { data }), wrap to match GetUsersResponse
    const users = await apiFetch<User[]>('/users');
    return { users };
  },

  async createSeason(req: CreateSeasonRequest): Promise<CreateSeasonResponse> {
    return apiFetch<CreateSeasonResponse>('/seasons', {
      method: 'POST',
      body: JSON.stringify({ treasurerUserId: req.treasurerUserId, name: req.name }),
    });
  },

  async updateTreasurer(req: UpdateTreasurerRequest): Promise<UpdateTreasurerResponse> {
    return apiFetch<UpdateTreasurerResponse>(`/seasons/${req.seasonId}/treasurer`, {
      method: 'PUT',
      body: JSON.stringify({ treasurerUserId: req.treasurerUserId }),
    });
  },

  async startSeason(seasonId: string): Promise<StartSeasonResponse> {
    return apiFetch<StartSeasonResponse>(`/seasons/${seasonId}/start`, {
      method: 'POST',
    });
  },

  async endSeason(req: EndSeasonRequest): Promise<EndSeasonResponse> {
    return apiFetch<EndSeasonResponse>(`/seasons/${req.seasonId}/end`, {
      method: 'POST',
    });
  },
};
