import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  SessionExpiredError,
  getDashboard,
  loginWithLaravel,
  logoutWithLaravel,
  resetLaravelSession,
  type DashboardProps,
  type StudentUser,
} from '../api/laravel';
import { setApiOnline } from '../offline/connection';
import {
  clearOfflineData,
  readCache,
  readRememberedUser,
  rememberUser,
  writeCache,
} from '../offline/storage';
import { clearSavedSessionCookies } from '../offline/sessionCookies';

export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'connection-error';

type AuthContextValue = {
  status: AuthStatus;
  user: StudentUser | null;
  dashboard: DashboardProps | null;
  connectionError: string | null;
  login(identifier: string, password: string): Promise<string | null>;
  logout(): Promise<void>;
  refreshSession(options?: { silent?: boolean }): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readableError(error: unknown): string {
  if (error instanceof SessionExpiredError) return error.message;
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return 'Cannot reach the live LIBTRACK server. Check your connection.';
  }
  return 'Unable to connect to LIBTRACK right now.';
}

function readCachedSession(): { user: StudentUser; dashboard: DashboardProps } | null {
  const user = readRememberedUser<StudentUser>();
  if (!user?.id) return null;
  const dashboard = readCache<DashboardProps>(`dashboard:${user.id}`);
  return dashboard ? { user, dashboard } : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<StudentUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardProps | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const refreshSession = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setStatus('loading');
    setConnectionError(null);

    try {
      const page = await getDashboard();
      const currentUser = page.props.auth?.user || page.props.user;
      setApiOnline(true);
      setUser(currentUser);
      setDashboard(page.props);
      if (currentUser?.id) {
        rememberUser(currentUser);
        writeCache(`dashboard:${currentUser.id}`, page.props);
      }
      setStatus(currentUser ? 'authenticated' : 'guest');
    } catch (error: unknown) {
      // A redirect to the login page is a normal guest session. A network/CORS
      // failure is surfaced separately so the connection gate is visible.
      if (error instanceof SessionExpiredError) {
        // The saved cookie is dead; drop it so the next cold start does not
        // keep restoring a session the server has already forgotten.
        clearSavedSessionCookies();
        setUser(null);
        setDashboard(null);
        setStatus('guest');
        return;
      }

      const connectionFailure = error instanceof TypeError || (error instanceof ApiError && error.status === 0);
      const cached = connectionFailure ? readCachedSession() : null;
      if (cached) {
        setApiOnline(false);
        setUser(cached.user);
        setDashboard(cached.dashboard);
        setConnectionError('You are offline. Showing your last synced library data.');
        setStatus('authenticated');
        return;
      }

      if (options.silent) {
        setConnectionError(readableError(error));
        return;
      }

      setUser(null);
      setDashboard(null);
      setConnectionError(readableError(error));
      setStatus('connection-error');
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (identifier: string, password: string): Promise<string | null> => {
    setStatus('loading');
    setConnectionError(null);

    try {
      await loginWithLaravel(identifier, password);
      await refreshSession();
      return null;
    } catch (error: unknown) {
      const message = readableError(error);
      setStatus('guest');
      setConnectionError(message);
      return message;
    }
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await logoutWithLaravel();
    resetLaravelSession();
    clearOfflineData();
    setUser(null);
    setDashboard(null);
    setStatus('guest');
    setConnectionError(null);
  }, []);

  const value = useMemo(
    () => ({ status, user, dashboard, connectionError, login, logout, refreshSession }),
    [status, user, dashboard, connectionError, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
