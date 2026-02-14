import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { authService } from '@/services/auth/auth-service';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; token: string };

type AuthContextValue = AuthState & {
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    authService.restoreSession().then((session) => {
      if (session) {
        setState({ status: 'authenticated', user: session.user, token: session.token });
      } else {
        setState({ status: 'unauthenticated' });
      }
    });
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    await authService.sendMagicLink(email);
  }, []);

  const verifyMagicLink = useCallback(async (email: string, code: string) => {
    const session = await authService.verifyMagicLink(email, code);
    setState({ status: 'authenticated', user: session.user, token: session.token });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, sendMagicLink, verifyMagicLink, logout }),
    [state, sendMagicLink, verifyMagicLink, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
