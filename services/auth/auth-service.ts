import type { User } from '@/types';
import { api } from '@/services/api/client';
import { tokenStorage } from './token-storage';

export type AuthSession = {
  token: string;
  user: User;
};

export const authService = {
  /** Send a magic link to the given email. Throws if not allowlisted. */
  async sendMagicLink(email: string): Promise<void> {
    await api.sendMagicLink(email);
  },

  /** Verify the magic link and persist the session token. */
  async verifyMagicLink(email: string, code: string): Promise<AuthSession> {
    const { token, user } = await api.verifyMagicLink(email, code);
    await tokenStorage.set(token);
    return { token, user };
  },

  /** Restore a session from stored token. Returns null if no valid session. */
  async restoreSession(): Promise<AuthSession | null> {
    const token = await tokenStorage.get();
    if (!token) return null;
    try {
      const { user } = await api.getMe(token);
      return { token, user };
    } catch {
      await tokenStorage.remove();
      return null;
    }
  },

  /** Clear the stored token and end the session. */
  async logout(): Promise<void> {
    await tokenStorage.remove();
  },
};
