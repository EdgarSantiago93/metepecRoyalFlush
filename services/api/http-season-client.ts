import type { User } from '@/types';
import { apiFetch, ApiError } from './http-auth-client';
import type {
  CreateSeasonRequest,
  CreateSeasonResponse,
  EndSeasonRequest,
  EndSeasonResponse,
  GetActiveSeasonResponse,
  GetDepositSubmissionsResponse,
  GetHostOrderResponse,
  GetUsersResponse,
  ReviewDepositRequest,
  ReviewDepositResponse,
  SaveHostOrderRequest,
  SaveHostOrderResponse,
  StartSeasonResponse,
  SubmitDepositRequest,
  SubmitDepositResponse,
  UpdateSeasonNameRequest,
  UpdateSeasonNameResponse,
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

  async updateSeasonName(req: UpdateSeasonNameRequest): Promise<UpdateSeasonNameResponse> {
    return apiFetch<UpdateSeasonNameResponse>(`/seasons/${req.seasonId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: req.name }),
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

  async getHostOrder(seasonId: string): Promise<GetHostOrderResponse> {
    return apiFetch<GetHostOrderResponse>(`/seasons/${seasonId}/host-order`);
  },

  async saveHostOrder(req: SaveHostOrderRequest): Promise<SaveHostOrderResponse> {
    return apiFetch<SaveHostOrderResponse>(`/seasons/${req.seasonId}/host-order`, {
      method: 'PUT',
      body: JSON.stringify({ userIds: req.userIds }),
    });
  },

  async submitDeposit(req: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    return apiFetch<SubmitDepositResponse>(`/seasons/${req.seasonId}/deposits`, {
      method: 'POST',
      body: JSON.stringify({
        mediaKey: req.mediaKey,
        ...(req.note ? { note: req.note } : {}),
      }),
    });
  },

  async getDepositSubmissions(seasonId: string): Promise<GetDepositSubmissionsResponse> {
    // Backend returns { deposits: [...] } with photoMediaId; map to frontend shape
    type BackendDeposit = {
      id: string;
      seasonId: string;
      userId: string;
      photoMediaId: string;
      note: string | null;
      status: string;
      reviewedAt: string | null;
      reviewedByUserId: string | null;
      reviewNote: string | null;
      createdAt: string;
    };
    const res = await apiFetch<BackendDeposit[] | { deposits: BackendDeposit[] }>(
      `/seasons/${seasonId}/deposits`,
    );
    const raw = Array.isArray(res) ? res : (res.deposits ?? []);
    const submissions = raw.map((d) => ({
      id: d.id,
      seasonId: d.seasonId,
      userId: d.userId,
      mediaKey: d.photoMediaId,
      note: d.note,
      status: d.status as 'pending' | 'approved' | 'rejected',
      reviewedAt: d.reviewedAt,
      reviewedByUserId: d.reviewedByUserId,
      reviewNote: d.reviewNote,
      createdAt: d.createdAt,
    }));
    return { submissions };
  },

  async reviewDeposit(req: ReviewDepositRequest): Promise<ReviewDepositResponse> {
    return apiFetch<ReviewDepositResponse>(`/deposits/${req.submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: req.action,
        reviewNote: req.reviewNote,
      }),
    });
  },
};
