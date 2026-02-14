import type { Season, SeasonMember, SeasonDepositSubmission, SeasonHostOrder, Session, User } from '@/types';

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
  photoUri: string;
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

/** Mock-swappable API client interface. */
export type ApiClient = {
  sendMagicLink: (email: string) => Promise<SendMagicLinkResponse>;
  verifyMagicLink: (email: string, code: string) => Promise<VerifyMagicLinkResponse>;
  getMe: (token: string) => Promise<GetMeResponse>;
  getActiveSeason: () => Promise<GetActiveSeasonResponse>;
  getActiveSession: () => Promise<GetActiveSessionResponse>;
  getUsers: () => Promise<GetUsersResponse>;
  createSeason: (req: CreateSeasonRequest) => Promise<CreateSeasonResponse>;
  submitDeposit: (req: SubmitDepositRequest) => Promise<SubmitDepositResponse>;
  getDepositSubmissions: (seasonId: string) => Promise<GetDepositSubmissionsResponse>;
  reviewDeposit: (req: ReviewDepositRequest) => Promise<ReviewDepositResponse>;
  getHostOrder: (seasonId: string) => Promise<GetHostOrderResponse>;
  saveHostOrder: (req: SaveHostOrderRequest) => Promise<SaveHostOrderResponse>;
  updateTreasurer: (req: UpdateTreasurerRequest) => Promise<UpdateTreasurerResponse>;
  startSeason: (seasonId: string) => Promise<StartSeasonResponse>;
};
