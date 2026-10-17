import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/app/AppShell';
import { OfflineModal } from './components/app/OfflineModal';
import { AppIconProvider } from './contexts/AppIconContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Borrowings } from './pages/Borrowings';
import { BrowseBooks } from './pages/BrowseBooks';
import { Dashboard } from './pages/Dashboard';
import { Fines } from './pages/Fines';
import { ForgotPassword } from './pages/ForgotPassword';
import { HelpCenter } from './pages/HelpCenter';
import { UpdateLogs } from './pages/UpdateLogs';
import { Login } from './pages/Login';
import { NightShelf } from './pages/NightShelf';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { StartGuide } from './pages/StartGuide';
import { ProductDemo } from './pages/ProductDemo';

interface AppProps {
  simulateOffline?: boolean;
  /** Moonlit login sky: follow the clock (6pm–6am), or force night/day for previewing */
  loginSky?: 'auto' | 'night' | 'day';
  /** LIBTRACK app icon design */
  appIcon?: 'openBook' | 'shelf' | 'bookmark' | 'monogram';
  /** Preview the Fines page with everything paid off */
  finesCleared?: boolean;
}

export function App({ simulateOffline = false, loginSky = 'auto', appIcon = 'openBook', finesCleared = false }: AppProps) {
  return (
    <AppIconProvider variant={appIcon}>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login sky={loginSky} />} />
          <Route path="/mobile/login" element={<Login sky={loginSky} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/mobile/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mobile/register" element={<Register />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="browse" element={<BrowseBooks />} />
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
        <OfflineModal simulateOffline={simulateOffline} />
      </BrowserRouter>
    </ThemeProvider>
    </AppIconProvider>);

}