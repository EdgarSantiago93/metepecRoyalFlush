import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { api } from '@/services/api/client';
import { authService } from '@/services/auth/auth-service';
import { setCurrentUserId } from '@/services/api/client';
import { setAuthToken } from '@/services/api/http-auth-client';
import type { UpdateBankingInfoRequest } from '@/services/api/types';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; token: string };

type AuthContextValue = AuthState & {
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBankingInfo: (req: UpdateBankingInfoRequest) => Promise<User>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function setAuth(token: string, userId: string) {
  setCurrentUserId(userId);
  setAuthToken(token, userId);
}

function clearAuth() {
  setCurrentUserId(null);
  setAuthToken(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    authService.restoreSession().then((session) => {
      if (session) {
        setAuth(session.token, session.user.id);
        setState({ status: 'authenticated', user: session.user, token: session.token });
      } else {
        setState({ status: 'unauthenticated' });
      }
    });
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    await authService.sendMagicLink(email);
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    const session = await authService.verifyMagicLink(token);
    setAuth(session.token, session.user.id);
    setState({ status: 'authenticated', user: session.user, token: session.token });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearAuth();
    setState({ status: 'unauthenticated' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (state.status !== 'authenticated') return;
    const session = await authService.restoreSession();
    if (session) {
      setState({ status: 'authenticated', user: session.user, token: session.token });
    }
  }, [state.status]);

  const updateBankingInfo = useCallback(async (req: UpdateBankingInfoRequest): Promise<User> => {
    const { user } = await api.updateBankingInfo(req);
    setState((prev) => {
      if (prev.status !== 'authenticated') return prev;
      return { ...prev, user };
    });
    return user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, sendMagicLink, verifyMagicLink, logout, refreshUser, updateBankingInfo }),
    [state, sendMagicLink, verifyMagicLink, logout, refreshUser, updateBankingInfo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
