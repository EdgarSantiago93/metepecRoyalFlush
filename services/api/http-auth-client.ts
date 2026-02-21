import { emitGlobalError } from './global-error';
import type { GetMeResponse, SendMagicLinkResponse, UpdateBankingInfoRequest, UpdateBankingInfoResponse, VerifyMagicLinkResponse } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const __DEV__ = process.env.NODE_ENV !== 'production';

let _authToken: string | null = null;
let _authUserId: string | null = null;

export function setAuthToken(token: string | null, userId: string | null = null): void {
  _authToken = token;
  _authUserId = userId;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const method = options.method ?? 'GET';

  if (__DEV__) {
    console.log(`[API] → ${method} ${url}`, options.body ?? '');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers as Record<string, string> },
    });
  } catch (err) {
    if (__DEV__) {
      console.error(`[API] ✗ ${method} ${url} — network error`, err);
    }
    emitGlobalError('❗️ ocurrió un error');
    throw new Error('No se pudo conectar al servidor. Verifica tu conexión.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as { message?: string })?.message ??
      `Error del servidor (${res.status})`;
    if (__DEV__) {
      console.error(`[API] ✗ ${method} ${url} — ${res.status}`, body);
    }
    if (res.status >= 500) {
      emitGlobalError('❗️ ocurrió un error');
    }
    throw new ApiError(message, res.status);
  }

  const raw = await res.json();
  if (__DEV__) {
    console.log(`[API] ✓ ${method} ${url} — ${res.status}`, raw);
  }
  // Backend wraps responses in { data, statusCode } — unwrap
  const data = (raw as { data?: unknown }).data ?? raw;
  return data as T;
}

export const httpAuth = {
  async sendMagicLink(email: string): Promise<SendMagicLinkResponse> {
    return apiFetch<SendMagicLinkResponse>('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse> {
    const res = await apiFetch<{ accessToken: string; user: VerifyMagicLinkResponse['user'] }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return { token: res.accessToken, user: res.user };
  },

  async getMe(token: string): Promise<GetMeResponse> {
    // Backend returns user fields directly in data — wrap to match GetMeResponse
    const user = await apiFetch<GetMeResponse['user']>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { user };
  },

  async updateBankingInfo(req: UpdateBankingInfoRequest): Promise<UpdateBankingInfoResponse> {
    if (!_authUserId) throw new Error('No authenticated session');
    // Backend returns user fields directly in data — wrap to match
    const user = await apiFetch<UpdateBankingInfoResponse['user']>(`/users/${_authUserId}`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    });
    return { user };
  },
};
