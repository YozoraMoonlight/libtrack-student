import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ThemeTransitionOverlay } from '../components/app/themeTransitions/ThemeTransitionOverlay';
import type { ThemeTransitionRequest } from '../components/app/themeTransitions/shared';
import { sounds } from '../utils/sound';

type Theme = 'light' | 'dark';

interface ThemeOrigin {
  clientX: number;
  clientY: number;
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (origin?: ThemeOrigin) => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'libtrack-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [request, setRequest] = useState<ThemeTransitionRequest | null>(null);
  const themeRef = useRef<Theme>(theme);
  const pendingRef = useRef<ThemeTransitionRequest | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    themeRef.current = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {

      // storage unavailable; theme still applies for this session
    }}, [theme]);

  const toggleTheme = useCallback((origin?: ThemeOrigin) => {
    if (pendingRef.current) return;
    const next: Theme = themeRef.current === 'dark' ? 'light' : 'dark';
    counter.current += 1;
    const nextRequest: ThemeTransitionRequest = {
      id: counter.current,
      to: next,
      x: origin && origin.clientX ? origin.clientX : window.innerWidth / 2,
      y: origin && origin.clientY ? origin.clientY : window.innerHeight / 2
    };
    pendingRef.current = nextRequest;
    if (next === 'dark') sounds.themeDark();else
    sounds.themeLight();
    setRequest(nextRequest);
  }, []);

  const handleCovered = useCallback(() => {
    const pending = pendingRef.current;
    if (pending) setTheme(pending.to);
  }, []);

  const handleDone = useCallback(() => {
    pendingRef.current = null;
    setRequest(null);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
      {request &&
      <ThemeTransitionOverlay
        key={request.id}
        request={request}
        onCovered={handleCovered}
        onDone={handleDone} />

      }
    </ThemeContext.Provider>);

}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.classList.toggle('dark', stored === 'dark');
      return stored;
    }
  } catch {

    // ignore
  }const initial: Theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', initial === 'dark');
  return initial;
}