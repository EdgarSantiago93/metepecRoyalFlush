import type { Season, SeasonMember, Session, User } from '@/types';

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

/** Mock-swappable API client interface. */
export type ApiClient = {
  sendMagicLink: (email: string) => Promise<SendMagicLinkResponse>;
  verifyMagicLink: (email: string, code: string) => Promise<VerifyMagicLinkResponse>;
  getMe: (token: string) => Promise<GetMeResponse>;
  getActiveSeason: () => Promise<GetActiveSeasonResponse>;
  getActiveSession: () => Promise<GetActiveSessionResponse>;
  getUsers: () => Promise<GetUsersResponse>;
  createSeason: (req: CreateSeasonRequest) => Promise<CreateSeasonResponse>;
};
