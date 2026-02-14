import type { User } from '@/types';

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

/** Mock-swappable API client interface. */
export type ApiClient = {
  sendMagicLink: (email: string) => Promise<SendMagicLinkResponse>;
  verifyMagicLink: (email: string, code: string) => Promise<VerifyMagicLinkResponse>;
  getMe: (token: string) => Promise<GetMeResponse>;
};
