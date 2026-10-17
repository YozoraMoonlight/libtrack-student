import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  SessionExpiredError,
  getDashboard,
  loginWithLaravel,
  logoutWithLaravel,
  recoverExpiredSession,
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
import { scheduleBackgroundCheck, stopBackgroundCheck } from '../api/backgroundPoll';

export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'connection-error';

/** The Inertia envelope `getDashboard` resolves with. */
type DashboardPage = Awaited<ReturnType<typeof getDashboard>>;

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

  const applyAuthenticatedPage = useCallback((page: DashboardPage) => {
    const currentUser = page.props.auth?.user || page.props.user;
    setApiOnline(true);
    setUser(currentUser);
    setDashboard(page.props);
    if (currentUser?.id) {
      rememberUser(currentUser);
      writeCache(`dashboard:${currentUser.id}`, page.props);
    }
    setStatus(currentUser ? 'authenticated' : 'guest');
  }, []);

  const refreshSession = useCallback(async (
    options: { silent?: boolean; allowSelfHeal?: boolean } = {},
  ) => {
    const { silent, allowSelfHeal = true } = options;
    if (!silent) setStatus('loading');
    setConnectionError(null);

    try {
      applyAuthenticatedPage(await getDashboard());
    } catch (error: unknown) {
      // A redirect to the login page is a normal guest session. A network/CORS
      // failure is surfaced separately so the connection gate is visible.
      if (error instanceof SessionExpiredError) {
        // "Expired" does not always mean the server forgot us. A restore can
        // land in Android's cookie jar imperfectly, leaving a stale copy that
        // shadows the good one, so the jar is rebuilt from the snapshot and the
        // read is tried once more.
        //
        // Only ever on a cold start. Right after an explicit sign-in the session
        // is supposed to be valid, and rebuilding the cookie jar there would be
        // throwing away a session the server just created.
        if (allowSelfHeal && (await recoverExpiredSession())) {
          await refreshSession({ silent, allowSelfHeal: false });
          return;
        }

        // The saved cookie really is dead; drop it so the next cold start does
        // not keep restoring a session the server has already forgotten.
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

      if (silent) {
        setConnectionError(readableError(error));
        return;
      }

      setUser(null);
      setDashboard(null);
      setConnectionError(readableError(error));
      setStatus('connection-error');
    }
  }, [applyAuthenticatedPage]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /**
   * Ask Android to keep checking for account changes once a student is in.
   *
   * Only meaningful while signed in - the check reads the session cookie and
   * does nothing at all without one - so it is tied to `authenticated` rather
   * than armed at launch. Idempotent, since WorkManager holds one job under a
   * unique name and this runs on every cold start.
   */
  useEffect(() => {
    if (status !== 'authenticated') return;
    void scheduleBackgroundCheck();
  }, [status]);

  const login = useCallback(async (identifier: string, password: string): Promise<string | null> => {
    setStatus('loading');
    setConnectionError(null);

    try {
      await loginWithLaravel(identifier, password);
      // Self-heal is off here: the session was just created by the login we
      // just performed, so there is no stale cookie to rebuild around.
      await refreshSession({ allowSelfHeal: false });
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
    // Stop the background check and drop the recorded counts. Skipping this
    // would leave the job running against a session that is no longer this
    // student's, and the next person to sign in on this phone would have the
    // previous one's history read out as brand new.
    void stopBackgroundCheck();
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
