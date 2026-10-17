import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  getDashboard,
  isConnectionError,
  loginWithLaravel,
  logoutWithLaravel,
  resetSessionCache,
  SessionExpiredError,
  type StudentUser,
} from '../api/client';

type AuthState = {
  user: StudentUser | null;
  loading: boolean;
  online: boolean;
  login(identifier: string, password: string): Promise<string | null>;
  logout(): Promise<void>;
  setUser(user: StudentUser): void;
  clearLocalSession(): void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Confirm the stored session against the live server before showing data,
    // so a stale cache never stands in for a real identity.
    let cancelled = false;

    (async () => {
      try {
        const props = await getDashboard();
        if (!cancelled) setUser(props.user ?? props.auth?.user ?? null);
      } catch (error) {
        if (isConnectionError(error)) {
          setOnline(false);
        } else if (error instanceof SessionExpiredError || error instanceof ApiError) {
          // Signed out for real: drop the previous student's cached pages.
          queryClient.clear();
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setOnline(true);
      queryClient.clear();
      try {
        const next = await loginWithLaravel(identifier, password);
        setUser(next && next.name ? next : null);
        return null;
      } catch (error) {
        if (isConnectionError(error)) {
          setOnline(false);
          return 'No connection to the LIBTRACK server. Check your internet and try again.';
        }
        if (error instanceof ApiError) {
          if (error.status === 422) return 'Those credentials do not match our records.';
          if (error.status === 419) return 'Your session expired. Please try again.';
          return error.message;
        }
        return 'Unable to sign in right now.';
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await logoutWithLaravel();
    resetSessionCache();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const clearLocalSession = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, online, login, logout, setUser, clearLocalSession }),
    [user, loading, online, login, logout, clearLocalSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
