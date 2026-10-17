import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/app/AppShell';
import { OfflineModal } from './components/app/OfflineModal';
import { AppIconProvider } from './contexts/AppIconContext';
import { OutboxSync } from './offline/OutboxSync';
import { ThemeProvider } from './contexts/ThemeContext';
import { Borrowings } from './pages/Borrowings';
import { BrowseBooks } from './pages/BrowseBooks';
import { Dashboard } from './pages/Dashboard';
import { Fines } from './pages/Fines';
import { HelpDesk } from './pages/HelpDesk';
import { UpdateLogs } from './pages/UpdateLogs';
import { Login } from './pages/Login';
import { NightShelf } from './pages/NightShelf';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';

interface AppProps {
  simulateOffline?: boolean;
  /** Moonlit login sky: follow the clock (6pm-6am), or force night/day for previewing */
  loginSky?: 'auto' | 'night' | 'day';
  /** LIBTRACK app icon design */
  appIcon?: 'openBook' | 'shelf' | 'bookmark' | 'monogram';
  /** Preview the Fines page with everything paid off */
  finesCleared?: boolean;
}

function ProtectedAppShell() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-paper text-ink/60">Connecting to LIBTRACK…</div>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

interface AuthenticatedAppProps {
  loginSky: NonNullable<AppProps['loginSky']>;
  finesCleared: boolean;
}

function AuthenticatedApp({ loginSky, finesCleared }: AuthenticatedAppProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login sky={loginSky} />} />
        <Route path="/mobile/login" element={<Login sky={loginSky} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/mobile/register" element={<Register />} />
        <Route path="/app" element={<ProtectedAppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="browse" element={<BrowseBooks />} />
          <Route path="borrowings" element={<Borrowings />} />
          <Route path="fines" element={<Fines cleared={finesCleared} />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<HelpDesk />} />
          <Route path="updates" element={<UpdateLogs />} />
        </Route>
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
      <AppIconProvider variant={appIcon}>
        <ThemeProvider>
          <OutboxSync />
          <AuthenticatedApp loginSky={loginSky} finesCleared={finesCleared} />
          <OfflineModal simulateOffline={simulateOffline} />
        </ThemeProvider>
      </AppIconProvider>
    </AuthProvider>
  );
}
