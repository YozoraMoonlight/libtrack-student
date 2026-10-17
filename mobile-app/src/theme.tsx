import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

export type Palette = {
  paper: string;
  surface: string;
  cream: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  ember: string;
  amber: string;
  amberDark: string;
  shelf: string;
  line: string;
  success: string;
  danger: string;
  shadow: string;
};

const light: Palette = {
  paper: '#f5f3ee',
  surface: '#ffffff',
  cream: '#fbefd5',
  ink: '#121212',
  inkSoft: 'rgba(18,18,18,0.62)',
  inkFaint: 'rgba(18,18,18,0.40)',
  ember: '#c2410c',
  amber: '#fb923c',
  amberDark: '#ea7317',
  shelf: '#e4cfa3',
  line: 'rgba(18,18,18,0.08)',
  success: '#15803d',
  danger: '#b91c1c',
  shadow: '#121212',
};

const dark: Palette = {
  paper: '#0b0b0b',
  surface: '#151515',
  cream: '#202020',
  ink: '#f5f5f5',
  inkSoft: 'rgba(245,245,245,0.66)',
  inkFaint: 'rgba(245,245,245,0.42)',
  ember: '#fb923c',
  amber: '#fbbf24',
  amberDark: '#f59e0b',
  shelf: '#2c2c2c',
  line: 'rgba(255,255,255,0.10)',
  success: '#4ade80',
  danger: '#f87171',
  shadow: '#000000',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

type ThemeValue = {
  theme: Theme;
  c: Palette;
  isDark: boolean;
  toggleTheme(): void;
};

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'libtrack-native-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setTheme(stored);
        else if (system === 'dark') setTheme('dark');
      })
      .catch(() => undefined);
  }, [system]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ theme, c: theme === 'dark' ? dark : light, isDark: theme === 'dark', toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
