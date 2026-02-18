import type { GetMeResponse, SendMagicLinkResponse, VerifyMagicLinkResponse } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const __DEV__ = process.env.NODE_ENV !== 'production';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const method = options.method ?? 'GET';

  if (__DEV__) {
    console.log(`[API] → ${method} ${url}`, options.body ?? '');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    if (__DEV__) {
      console.error(`[API] ✗ ${method} ${url} — network error`, err);
    }
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
    throw new Error(message);
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
    return apiFetch<GetMeResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
