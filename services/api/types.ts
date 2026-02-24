import type { EndingSubmission, Season, SeasonMember, SeasonDepositSubmission, SeasonHostOrder, SeasonPayout, Session, SessionFinalizeNote, SessionInjection, SessionParticipant, User } from '@/types';
import type { InjectionType } from '@/types/models/session';

export type SendMagicLinkResponse = {
  success: boolean;
  message: string;
};

export type VerifyMagicLinkResponse = {
  token: string;
  user: User;
};

export type GetMeResponse = {
  user: User;
};

// ---------------------------------------------------------------------------
// Season / Session responses
// ---------------------------------------------------------------------------

export type GetActiveSeasonResponse = {
  season: Season | null;
  members: SeasonMember[];
};

export type GetActiveSessionResponse = {
  session: Session | null;
};

export type GetUsersResponse = {
  users: User[];
};

export type CreateSeasonRequest = {
  treasurerUserId: string;
  name?: string;
};

export type CreateSeasonResponse = {
  season: Season;
  members: SeasonMember[];
};

// ---------------------------------------------------------------------------
// Deposit submissions
// ---------------------------------------------------------------------------

export type SubmitDepositRequest = {
  seasonId: string;
  userId: string;
  mediaId: string;
  note?: string;
};

export type SubmitDepositResponse = {
  submission: SeasonDepositSubmission;
  member: SeasonMember;
};

export type GetDepositSubmissionsResponse = {
  submissions: SeasonDepositSubmission[];
};

export type ReviewDepositRequest = {
  submissionId: string;
  action: 'approve' | 'reject';
  reviewNote?: string;
};

export type ReviewDepositResponse = {
  submission: SeasonDepositSubmission;
  member: SeasonMember;
};

// ---------------------------------------------------------------------------
// Host order
// ---------------------------------------------------------------------------

export type GetHostOrderResponse = {
  hostOrder: SeasonHostOrder[];
};

export type SaveHostOrderRequest = {
  seasonId: string;
  userIds: string[];
};

export type SaveHostOrderResponse = {
  hostOrder: SeasonHostOrder[];
};

// ---------------------------------------------------------------------------
// Season management
// ---------------------------------------------------------------------------

export type UpdateSeasonNameRequest = {
  seasonId: string;
  name: string;
};

export type UpdateSeasonNameResponse = {
  season: Season;
};

export type UpdateTreasurerRequest = {
  seasonId: string;
  treasurerUserId: string;
};

export type UpdateTreasurerResponse = {
  season: Season;
};

export type StartSeasonResponse = {
  season: Season;
};

// ---------------------------------------------------------------------------
// Session scheduling
// ---------------------------------------------------------------------------

export type ScheduleSessionRequest = {
  seasonId: string;
  hostUserId: string;
  scheduledFor?: string;
  location?: string;
};

export type ScheduleSessionResponse = {
  session: Session;
};

export type UpdateScheduledSessionRequest = {
  sessionId: string;
  hostUserId?: string;
  scheduledFor?: string | null;
  location?: string | null;
};

export type UpdateScheduledSessionResponse = {
  session: Session;
};

export type StartSessionResponse = {
  session: Session;
};

// ---------------------------------------------------------------------------
// Session participants (dealing phase)
// ---------------------------------------------------------------------------

export type GetSessionParticipantsResponse = {
  participants: SessionParticipant[];
};

export type CheckInResponse = {
  participant: SessionParticipant;
};

export type ConfirmStartResponse = {
  participant: SessionParticipant;
};

export type DisputeStartRequest = {
  sessionId: string;
  participantId: string;
  note: string;
};

export type DisputeStartResponse = {
  participant: SessionParticipant;
};

export type RemoveParticipantResponse = {
  participant: SessionParticipant;
};

export type AddGuestRequest = {
  sessionId: string;
  guestName: string;
};

export type AddGuestResponse = {
  participant: SessionParticipant;
  injection: SessionInjection;
};

export type MoveToInProgressResponse = {
  session: Session;
};

// ---------------------------------------------------------------------------
// Session injections (rebuys — in_progress phase)
// ---------------------------------------------------------------------------

export type GetSessionInjectionsResponse = {
  injections: SessionInjection[];
};

export type RequestRebuyRequest = {
  sessionId: string;
  type: InjectionType;
  proofMediaKey?: string;
};

export type RequestRebuyResponse = {
  injection: SessionInjection;
};

export type ReviewInjectionRequest = {
  injectionId: string;
  action: 'approve' | 'reject';
  reviewNote?: string;
};

export type ReviewInjectionResponse = {
  injection: SessionInjection;
};

export type EndSessionResponse = {
  session: Session;
};

// ---------------------------------------------------------------------------
// Ending submissions (closing phase)
// ---------------------------------------------------------------------------

export type GetEndingSubmissionsResponse = {
  submissions: EndingSubmission[];
};

export type SubmitEndingStackRequest = {
  sessionId: string;
  participantId: string;
  endingStackCents: number;
  mediaKey: string;
  note?: string;
  submittedByUserId?: string;
};

export type SubmitEndingStackResponse = {
  submission: EndingSubmission;
};

export type ReviewEndingSubmissionRequest = {
  submissionId: string;
  action: 'validate' | 'reject';
  reviewNote?: string;
};

export type ReviewEndingSubmissionResponse = {
  submission: EndingSubmission;
};

// ---------------------------------------------------------------------------
// Session finalization (Phase 6)
// ---------------------------------------------------------------------------

export type FinalizeSessionRequest = {
  sessionId: string;
  overrideNote?: string; // required when sum(PnL) != 0
};

export type FinalizeSessionResponse = {
  session: Session;
  members: SeasonMember[];
  finalizeNote: SessionFinalizeNote | null;
};

export type GetSessionFinalizeNoteResponse = {
  finalizeNote: SessionFinalizeNote | null;
};

// ---------------------------------------------------------------------------
// End Season
// ---------------------------------------------------------------------------

export type EndSeasonRequest = { seasonId: string };
export type EndSeasonResponse = { season: Season };

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export type GetPayoutsResponse = {
  payouts: SeasonPayout[];
};

export type SendPayoutRequest = {
  seasonId: string;
  toUserId: string;
  amountCents: number;
  proofMediaKey?: string;
  note?: string;
};

export type SendPayoutResponse = {
  payout: SeasonPayout;
};

export type ConfirmPayoutResponse = {
  payout: SeasonPayout;
};

export type DisputePayoutRequest = {
  payoutId: string;
  disputeNote: string;
};

export type DisputePayoutResponse = {
  payout: SeasonPayout;
};

export type ResolvePayoutResponse = {
  payout: SeasonPayout;
};

export type UpdateBankingInfoRequest = {
  bankingNombre?: string | null;
  bankingCuenta?: string | null;
  bankingBanco?: string | null;
  bankingClabe?: string | null;
};

export type UpdateBankingInfoResponse = {
  user: User;
};

// ---------------------------------------------------------------------------
// Ledger (Phase 7)
// ---------------------------------------------------------------------------

export type GetSeasonSessionsResponse = {
  sessions: Session[];
};

export type GetSessionDetailResponse = {
  session: Session;
  participants: SessionParticipant[];
  injections: SessionInjection[];
  endingSubmissions: EndingSubmission[];
  finalizeNote: SessionFinalizeNote | null;
};

/** Mock-swappable API client interface. */
export type ApiClient = {
  sendMagicLink: (email: string) => Promise<SendMagicLinkResponse>;
  verifyMagicLink: (token: string) => Promise<VerifyMagicLinkResponse>;
  getMe: (token: string) => Promise<GetMeResponse>;
  getActiveSeason: () => Promise<GetActiveSeasonResponse>;
  getActiveSession: () => Promise<GetActiveSessionResponse>;
  getUsers: () => Promise<GetUsersResponse>;
  createSeason: (req: CreateSeasonRequest) => Promise<CreateSeasonResponse>;
  submitDeposit: (req: SubmitDepositRequest) => Promise<SubmitDepositResponse>;
  getDepositSubmissions: (seasonId: string) => Promise<GetDepositSubmissionsResponse>;
  reviewDeposit: (req: ReviewDepositRequest) => Promise<ReviewDepositResponse>;
  updateSeasonName: (req: UpdateSeasonNameRequest) => Promise<UpdateSeasonNameResponse>;
  getHostOrder: (seasonId: string) => Promise<GetHostOrderResponse>;
  saveHostOrder: (req: SaveHostOrderRequest) => Promise<SaveHostOrderResponse>;
  updateTreasurer: (req: UpdateTreasurerRequest) => Promise<UpdateTreasurerResponse>;
  startSeason: (seasonId: string) => Promise<StartSeasonResponse>;
  scheduleSession: (req: ScheduleSessionRequest) => Promise<ScheduleSessionResponse>;
  updateScheduledSession: (req: UpdateScheduledSessionRequest) => Promise<UpdateScheduledSessionResponse>;
  startSession: (sessionId: string) => Promise<StartSessionResponse>;
  getSessionParticipants: (sessionId: string) => Promise<GetSessionParticipantsResponse>;
  checkInToSession: (sessionId: string) => Promise<CheckInResponse>;
  confirmStartingStack: (sessionId: string, participantId: string) => Promise<ConfirmStartResponse>;
  disputeStartingStack: (req: DisputeStartRequest) => Promise<DisputeStartResponse>;
  removeParticipant: (sessionId: string, participantId: string) => Promise<RemoveParticipantResponse>;
  addGuest: (req: AddGuestRequest) => Promise<AddGuestResponse>;
  moveSessionToInProgress: (sessionId: string) => Promise<MoveToInProgressResponse>;
  getSessionInjections: (sessionId: string) => Promise<GetSessionInjectionsResponse>;
  requestRebuy: (req: RequestRebuyRequest) => Promise<RequestRebuyResponse>;
  reviewInjection: (req: ReviewInjectionRequest) => Promise<ReviewInjectionResponse>;
  endSession: (sessionId: string) => Promise<EndSessionResponse>;
  getEndingSubmissions: (sessionId: string) => Promise<GetEndingSubmissionsResponse>;
  submitEndingStack: (req: SubmitEndingStackRequest) => Promise<SubmitEndingStackResponse>;
  reviewEndingSubmission: (req: ReviewEndingSubmissionRequest) => Promise<ReviewEndingSubmissionResponse>;
  finalizeSession: (req: FinalizeSessionRequest) => Promise<FinalizeSessionResponse>;
  getSessionFinalizeNote: (sessionId: string) => Promise<GetSessionFinalizeNoteResponse>;
  // End Season
  endSeason: (req: EndSeasonRequest) => Promise<EndSeasonResponse>;
  // Payouts
  getPayouts: (seasonId: string) => Promise<GetPayoutsResponse>;
  sendPayout: (req: SendPayoutRequest) => Promise<SendPayoutResponse>;
  confirmPayout: (payoutId: string) => Promise<ConfirmPayoutResponse>;
  disputePayout: (req: DisputePayoutRequest) => Promise<DisputePayoutResponse>;
  resolvePayout: (payoutId: string) => Promise<ResolvePayoutResponse>;
  updateBankingInfo: (req: UpdateBankingInfoRequest) => Promise<UpdateBankingInfoResponse>;
  // Ledger
  getSeasonSessions: (seasonId: string) => Promise<GetSeasonSessionsResponse>;
  getSessionDetail: (sessionId: string) => Promise<GetSessionDetailResponse>;
};
