import type { EndingSubmission, User } from '@/types';
import { ApiError, apiFetch } from './http-auth-client';
import type {
  AddGuestRequest,
  AddGuestResponse,
  CheckInResponse,
  ConfirmStartResponse,
  CreateSeasonRequest,
  CreateSeasonResponse,
  DisputeStartRequest,
  DisputeStartResponse,
  EndSeasonRequest,
  EndSeasonResponse,
  EndSessionResponse,
  FinalizeSessionRequest,
  FinalizeSessionResponse,
  GetActiveSeasonResponse,
  GetDepositSubmissionsResponse,
  GetEndingSubmissionsResponse,
  GetHostOrderResponse,
  GetSeasonSessionsResponse,
  GetSessionDetailResponse,
  GetSessionFinalizeNoteResponse,
  GetSessionInjectionsResponse,
  GetSessionParticipantsResponse,
  GetUsersResponse,
  MoveToInProgressResponse,
  RemoveParticipantResponse,
  RequestRebuyRequest,
  RequestRebuyResponse,
  ReviewDepositRequest,
  ReviewDepositResponse,
  ReviewEndingSubmissionRequest,
  ReviewEndingSubmissionResponse,
  ReviewInjectionRequest,
  ReviewInjectionResponse,
  SaveHostOrderRequest,
  SaveHostOrderResponse,
  ScheduleSessionRequest,
  ScheduleSessionResponse,
  StartSeasonResponse,
  StartSessionResponse,
  SubmitDepositRequest,
  SubmitDepositResponse,
  SubmitEndingStackRequest,
  SubmitEndingStackResponse,
  UpdateScheduledSessionRequest,
  UpdateScheduledSessionResponse,
  UpdateSeasonNameRequest,
  UpdateSeasonNameResponse,
  UpdateTreasurerRequest,
  UpdateTreasurerResponse,
} from './types';

function mapEndingSubmission(raw: Record<string, unknown>): EndingSubmission {
  return { ...raw, mediaKey: (raw.photoMediaId as string) ?? raw.mediaKey } as EndingSubmission;
}

export const httpSeason = {
  async getActiveSeason(): Promise<GetActiveSeasonResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await apiFetch<any>('/seasons/active');
      const currentSession = raw.currentSession
        ? {
            session: raw.currentSession.session,
            participants: raw.currentSession.participants ?? [],
            injections: raw.currentSession.injections ?? [],
            endingSubmissions: (
              raw.currentSession.submissions ??
              raw.currentSession.endingSubmissions ??
              []
            ).map(mapEndingSubmission),
            finalizeNote: raw.currentSession.finalizeNote ?? null,
          }
        : null;
      return {
        season: raw.season,
        members: raw.members ?? [],
        hostOrder: raw.hostOrder ?? [],
        currentSession,
      };
    } catch (err) {
      // 404 means no active season — valid state, not an error
      if (err instanceof ApiError && err.status === 404) {
        return { season: null, members: [], hostOrder: [], currentSession: null };
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
        mediaId: req.mediaId,
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

  async scheduleSession(req: ScheduleSessionRequest): Promise<ScheduleSessionResponse> {
    console.log('🚀🚀🚀🚀scheduleSession', req);
    return apiFetch<ScheduleSessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        seasonId: req.seasonId,
        hostUserId: req.hostUserId,
        ...(req.scheduledFor ? { scheduledFor: req.scheduledFor } : {}),
        ...(req.location ? { location: req.location } : {}),
      }),
    });
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

  async getSessionDetail(sessionId: string): Promise<GetSessionDetailResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiFetch<any>(`/sessions/${sessionId}`);
    return {
      session: raw.session,
      participants: raw.participants ?? [],
      injections: raw.injections ?? [],
      endingSubmissions: (raw.submissions ?? raw.endingSubmissions ?? []).map(mapEndingSubmission),
      finalizeNote: raw.finalizeNote ?? null,
    };
  },

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async updateScheduledSession(req: UpdateScheduledSessionRequest): Promise<UpdateScheduledSessionResponse> {
    return apiFetch<UpdateScheduledSessionResponse>(`/sessions/${req.sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(req.hostUserId !== undefined ? { hostUserId: req.hostUserId } : {}),
        ...(req.scheduledFor !== undefined ? { scheduledFor: req.scheduledFor } : {}),
        ...(req.location !== undefined ? { location: req.location } : {}),
      }),
    });
  },

  async startSession(sessionId: string): Promise<StartSessionResponse> {
    return apiFetch<StartSessionResponse>(`/sessions/${sessionId}/start-dealing`, {
      method: 'POST',
    });
  },

  async moveSessionToInProgress(sessionId: string): Promise<MoveToInProgressResponse> {
    return apiFetch<MoveToInProgressResponse>(`/sessions/${sessionId}/move-to-in-progress`, {
      method: 'POST',
    });
  },

  async endSession(sessionId: string): Promise<EndSessionResponse> {
    return apiFetch<EndSessionResponse>(`/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  },

  // ---------------------------------------------------------------------------
  // Session participants (dealing phase)
  // ---------------------------------------------------------------------------

  async getSessionParticipants(sessionId: string): Promise<GetSessionParticipantsResponse> {
    return apiFetch<GetSessionParticipantsResponse>(`/sessions/${sessionId}/participants`);
  },

  async checkInToSession(sessionId: string): Promise<CheckInResponse> {
    return apiFetch<CheckInResponse>(`/sessions/${sessionId}/check-in`, {
      method: 'POST',
    });
  },

  async confirmStartingStack(sessionId: string, participantId: string): Promise<ConfirmStartResponse> {
    return apiFetch<ConfirmStartResponse>(`/sessions/${sessionId}/participants/${participantId}/confirm`, {
      method: 'POST',
    });
  },

  async disputeStartingStack(req: DisputeStartRequest): Promise<DisputeStartResponse> {
    return apiFetch<DisputeStartResponse>(`/sessions/${req.sessionId}/participants/${req.participantId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ note: req.note }),
    });
  },

  async removeParticipant(sessionId: string, participantId: string): Promise<RemoveParticipantResponse> {
    return apiFetch<RemoveParticipantResponse>(`/sessions/${sessionId}/participants/${participantId}/remove`, {
      method: 'POST',
    });
  },

  async addGuest(req: AddGuestRequest): Promise<AddGuestResponse> {
    return apiFetch<AddGuestResponse>(`/sessions/${req.sessionId}/guests`, {
      method: 'POST',
      body: JSON.stringify({ guestName: req.guestName }),
    });
  },

  // ---------------------------------------------------------------------------
  // Session injections (rebuys — in_progress phase)
  // ---------------------------------------------------------------------------

  async getSessionInjections(sessionId: string): Promise<GetSessionInjectionsResponse> {
    return apiFetch<GetSessionInjectionsResponse>(`/sessions/${sessionId}/injections`);
  },

  async requestRebuy(req: RequestRebuyRequest): Promise<RequestRebuyResponse> {
    return apiFetch<RequestRebuyResponse>(`/sessions/${req.sessionId}/injections`, {
      method: 'POST',
      body: JSON.stringify({
        type: req.type,
        ...(req.proofMediaKey ? { proofPhotoUrl: req.proofMediaKey } : {}),
      }),
    });
  },

  async reviewInjection(req: ReviewInjectionRequest): Promise<ReviewInjectionResponse> {
    return apiFetch<ReviewInjectionResponse>(`/injections/${req.injectionId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: req.action,
        ...(req.reviewNote ? { reviewNote: req.reviewNote } : {}),
      }),
    });
  },

  // ---------------------------------------------------------------------------
  // Ending submissions (closing phase)
  // ---------------------------------------------------------------------------

  async getEndingSubmissions(sessionId: string): Promise<GetEndingSubmissionsResponse> {
    // Backend returns { submissions } with photoMediaId; map to frontend shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await apiFetch<any>(`/sessions/${sessionId}/submissions`);
    const submissions = (raw.submissions ?? raw ?? []).map(mapEndingSubmission);
    return { submissions };
  },

  async submitEndingStack(req: SubmitEndingStackRequest): Promise<SubmitEndingStackResponse> {
    return apiFetch<SubmitEndingStackResponse>(`/sessions/${req.sessionId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({
        participantId: req.participantId,
        endingStackCents: req.endingStackCents,
        photoUrl: req.mediaKey,
        ...(req.note ? { note: req.note } : {}),
        ...(req.submittedByUserId ? { submittedByUserId: req.submittedByUserId } : {}),
      }),
    });
  },

  async reviewEndingSubmission(req: ReviewEndingSubmissionRequest): Promise<ReviewEndingSubmissionResponse> {
    return apiFetch<ReviewEndingSubmissionResponse>(`/submissions/${req.submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: req.action,
        ...(req.reviewNote ? { reviewNote: req.reviewNote } : {}),
      }),
    });
  },

  // ---------------------------------------------------------------------------
  // Session finalization
  // ---------------------------------------------------------------------------

  async finalizeSession(req: FinalizeSessionRequest): Promise<FinalizeSessionResponse> {
    return apiFetch<FinalizeSessionResponse>(`/sessions/${req.sessionId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({
        ...(req.overrideNote ? { overrideNote: req.overrideNote } : {}),
      }),
    });
  },

  async getSessionFinalizeNote(sessionId: string): Promise<GetSessionFinalizeNoteResponse> {
    return apiFetch<GetSessionFinalizeNoteResponse>(`/sessions/${sessionId}/finalize-note`);
  },

  // ---------------------------------------------------------------------------
  // Ledger
  // ---------------------------------------------------------------------------

  async getSeasonSessions(seasonId: string): Promise<GetSeasonSessionsResponse> {
    return apiFetch<GetSeasonSessionsResponse>(`/seasons/${seasonId}/sessions`);
  },
};
