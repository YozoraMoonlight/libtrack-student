import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/app/AppShell';
import { OfflineModal } from './components/app/OfflineModal';
import { OutboxSync } from './offline/OutboxSync';
import { ThemeProvider } from './contexts/ThemeContext';
import { Borrowings } from './pages/Borrowings';
import { BrowseBooks } from './pages/BrowseBooks';
import { Dashboard } from './pages/Dashboard';
import { Fines } from './pages/Fines';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';

interface AppProps {
  simulateOffline?: boolean;
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

function AuthenticatedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mobile/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/mobile/register" element={<Register />} />
        <Route path="/app" element={<ProtectedAppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="browse" element={<BrowseBooks />} />
          <Route path="borrowings" element={<Borrowings />} />
          <Route path="fines" element={<Fines />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App({ simulateOffline = false }: AppProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <OutboxSync />
        <AuthenticatedApp />
        <OfflineModal simulateOffline={simulateOffline} />
      </ThemeProvider>
    </AuthProvider>
  );
}
