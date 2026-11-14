import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { watchSessionPersistence, hasSavedSessionCookie } from './api/laravel';
import { consumeLaunchRoute, watchNotificationTaps } from './api/systemNotifications';
import { LibraryDataProvider } from './api/libraryData';
import { BorrowCartProvider } from './api/borrowCart';
import { AppShell } from './components/app/AppShell';
import { OfflineModal } from './components/app/OfflineModal';
import { AppIconProvider } from './contexts/AppIconContext';
import { OutboxSync } from './offline/OutboxSync';
import { ThemeProvider } from './contexts/ThemeContext';
import { Borrowings } from './pages/Borrowings';
import { BorrowCart } from './pages/BorrowCart';
import { BrowseBooks } from './pages/BrowseBooks';
import { Dashboard } from './pages/Dashboard';
import { Fines } from './pages/Fines';
import { ForgotPassword } from './pages/ForgotPassword';
import { HelpCenter } from './pages/HelpCenter';
import { UpdateLogs } from './pages/UpdateLogs';
import { RestoringScreen } from './components/auth/RestoringScreen';
import { Login } from './pages/Login';
import { NightShelf } from './pages/NightShelf';
import { ReadBook } from './pages/ReadBook';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { StartGuide } from './pages/StartGuide';
import { ProductDemo } from './pages/ProductDemo';

interface AppProps {
  simulateOffline?: boolean;
  /** Moonlit login sky: follow the clock (6pm-6am), or force night/day for previewing */
  loginSky?: 'auto' | 'night' | 'day';
  /** LIBTRACK app icon design */
  appIcon?: 'openBook' | 'shelf' | 'bookmark' | 'monogram';
  /** Preview the Fines page with everything paid off */
  finesCleared?: boolean;
}

/**
 * True when there is a saved session waiting to be restored.
 *
 * This is what decides whether a cold start is a *returning* user's moment or a
 * first-time visitor's. Telling somebody who never signed in that their session
 * is being restored is simply a lie, and it was showing on every launch.
 *
 * Read straight from localStorage, which is synchronous and already populated by
 * the time React renders.
 */
function hasSessionToRestore(): boolean {
  try {
    return hasSavedSessionCookie();
  } catch {
    return false;
  }
}

/**
 * The boot screen for somebody who was signed in: the owl waking up while the
 * saved session is put back. Only ever shown when there is genuinely something
 * to restore.
 */
function Connecting() {
  return <RestoringScreen />;
}

function ProtectedAppShell() {
  const { status } = useAuth();

  if (status === 'loading') {
    // Nothing saved means nothing to restore, so there is no reason to wait.
    return hasSessionToRestore() ? <Connecting /> : <Navigate to="/login" replace />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

/**
 * Where a cold start should land.
 *
 * The WebView always boots at `/`, so this is the only place that knows whether
 * the restored session is good. It used to redirect straight to `/login`, which
 * meant a perfectly valid session still landed on the sign-in form and looked
 * exactly like having been logged out.
 *
 * A returning user holds on the restoring screen; anyone else goes straight to
 * the sign-in form, which is the designed surface for a first-time visitor.
 */
function Entry() {
  const { status } = useAuth();

  if (status === 'loading') {
    return hasSessionToRestore() ? <Connecting /> : <Navigate to="/login" replace />;
  }

  return <Navigate to={status === 'authenticated' ? '/app' : '/login'} replace />;
}

/**
 * Someone already signed in has no business on the sign-in form.
 *
 * Holds the restoring screen only for a returning user, so a cold start never
 * flashes the sign-in form at somebody who turns out to still be signed in.
 */
function RequireGuest({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading' && hasSessionToRestore()) return <Connecting />;
  if (status === 'authenticated') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/**
 * Honours a tapped Android notification.
 *
 * Two paths, because neither covers both cases alone:
 *
 *   cold start  - the route is in the activity's launch intent, which the
 *                 plugin never inspects, so LaunchRoute hands it over natively.
 *   already up  - the plugin's own tap event fires and carries the route.
 *
 * Waiting for `authenticated` matters: navigating while the session is still
 * restoring would land on /login and lose the route.
 */
function NotificationDeepLink() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const handle = watchNotificationTaps((route) => {
      if (statusRef.current !== 'authenticated') return;
      navigate(route, { replace: true });
    });

    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [navigate]);

  /**
   * Cold start: read the route from the launch intent, once.
   *
   * Deliberately NOT read on mount. A cold start begins with status 'loading',
   * and consuming before the session is restored would take the route and then
   * discard it for not being authenticated yet - the tap silently landed on the
   * dashboard instead. Waiting for 'authenticated' is what makes it stick.
   */
  useEffect(() => {
    if (status !== 'authenticated') return;

    void (async () => {
      const route = await consumeLaunchRoute();
      if (!route) return;
      navigate(route, { replace: true });
    })();
  }, [status, navigate]);

  return null;
}

/**
 * Snapshots the session cookie whenever the app goes to the background.
 *
 * Android is free to freeze or kill a backgrounded WebView at any point, so
 * the save has to happen on the way out. Mounted above the router and the auth
 * provider so it is live for the whole app lifetime, signed in or not, and it
 * renders nothing.
 */
function SessionPersistence() {
  useEffect(() => watchSessionPersistence(), []);
  return null;
}

function AuthenticatedApp({ loginSky, finesCleared }: { loginSky: NonNullable<AppProps['loginSky']>; finesCleared: boolean }) {
  return (
    <BrowserRouter>
      {/* Inside the router: it calls useNavigate, and react-router throws a
          message-less Error in production if a hook runs outside a Router. */}
      <NotificationDeepLink />
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/login" element={<RequireGuest><Login sky={loginSky} /></RequireGuest>} />
        <Route path="/mobile/login" element={<RequireGuest><Login sky={loginSky} /></RequireGuest>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/mobile/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/mobile/register" element={<Register />} />
        <Route path="/app" element={<ProtectedAppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="browse" element={<BrowseBooks />} />
          <Route path="books/:id/read" element={<ReadBook />} />
          <Route path="cart" element={<BorrowCart />} />
          <Route path="borrowings" element={<Borrowings />} />
          <Route path="fines" element={<Fines cleared={finesCleared} />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="updates" element={<UpdateLogs />} />
        </Route>
        <Route path="/guides/:guideId" element={<StartGuide />} />
        <Route path="/demos/:demoId" element={<ProductDemo />} />
        <Route path="/night-shelf" element={<NightShelf />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App({
  simulateOffline = false,
  loginSky = 'auto',
  appIcon = 'openBook',
  finesCleared = false,
}: AppProps) {
  return (
    <AuthProvider>
      <SessionPersistence />
      <LibraryDataProvider>
        <BorrowCartProvider>
          <AppIconProvider variant={appIcon}>
            <ThemeProvider>
              <OutboxSync />
              <AuthenticatedApp loginSky={loginSky} finesCleared={finesCleared} />
              <OfflineModal simulateOffline={simulateOffline} />
            </ThemeProvider>
          </AppIconProvider>
        </BorrowCartProvider>
      </LibraryDataProvider>
    </AuthProvider>
  );
}
