import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { authService } from '@/services/auth/auth-service';
import { setCurrentUserId } from '@/services/api/client';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; token: string };

type AuthContextValue = AuthState & {
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    authService.restoreSession().then((session) => {
      if (session) {
        setCurrentUserId(session.user.id);
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
    setCurrentUserId(session.user.id);
    setState({ status: 'authenticated', user: session.user, token: session.token });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setCurrentUserId(null);
    setState({ status: 'unauthenticated' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (state.status !== 'authenticated') return;
    const session = await authService.restoreSession();
    if (session) {
      setState({ status: 'authenticated', user: session.user, token: session.token });
    }
  }, [state.status]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, sendMagicLink, verifyMagicLink, logout, refreshUser }),
    [state, sendMagicLink, verifyMagicLink, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
