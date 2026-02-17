import type { GetMeResponse, SendMagicLinkResponse, VerifyMagicLinkResponse } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('No se pudo conectar al servidor. Verifica tu conexión.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as { message?: string })?.message ??
      `Error del servidor (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const httpAuth = {
  async sendMagicLink(email: string): Promise<SendMagicLinkResponse> {
    return apiFetch<SendMagicLinkResponse>('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyMagicLink(email: string, code: string): Promise<VerifyMagicLinkResponse> {
    return apiFetch<VerifyMagicLinkResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async getMe(token: string): Promise<GetMeResponse> {
    return apiFetch<GetMeResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
