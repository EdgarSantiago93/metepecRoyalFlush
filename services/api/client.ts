import { SEED_USERS_BY_EMAIL } from '@/data/seed-users';
import type { ApiClient } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Parse a mock token to extract the email.
 * Format: `mock-session-<email>-<timestamp>`
 */
function emailFromToken(token: string): string | null {
  const match = token.match(/^mock-session-(.+)-\d+$/);
  return match?.[1] ?? null;
}

/** In-memory token → email map for the current process lifetime. */
const activeTokens = new Map<string, string>();

/**
 * Mock API client.
 * To swap for a real backend: implement the `ApiClient` interface and change this export.
 */
export const api: ApiClient = {
  async sendMagicLink(email: string) {
    await delay(800);
    const normalized = email.toLowerCase().trim();
    const user = SEED_USERS_BY_EMAIL.get(normalized);
    if (!user) {
      throw new Error('Email not found in allowlist');
    }
    return { success: true, message: `Magic link sent to ${user.email}` };
  },

  async verifyMagicLink(email: string, _code: string) {
    await delay(500);
    const normalized = email.toLowerCase().trim();
    const user = SEED_USERS_BY_EMAIL.get(normalized);
    if (!user) {
      throw new Error('Email not found in allowlist');
    }
    const token = `mock-session-${normalized}-${Date.now()}`;
    activeTokens.set(token, normalized);
    return { token, user };
  },

  async getMe(token: string) {
    await delay(300);

    // First try in-memory map (same process)
    const emailFromMap = activeTokens.get(token);
    if (emailFromMap) {
      const user = SEED_USERS_BY_EMAIL.get(emailFromMap);
      if (user) return { user };
    }

    // Fallback: parse email from token (survives app restart)
    const emailFromParsed = emailFromToken(token);
    if (emailFromParsed) {
      const user = SEED_USERS_BY_EMAIL.get(emailFromParsed);
      if (user) {
        activeTokens.set(token, emailFromParsed);
        return { user };
      }
    }

    throw new Error('Invalid or expired session');
  },
};
