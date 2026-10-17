export type TransitionPhase = 'cover' | 'hold' | 'reveal';

export interface ThemeTransitionRequest {
  id: number;
  to: 'light' | 'dark';
  x: number;
  y: number;
}

export interface TransitionVariantProps {
  request: ThemeTransitionRequest;
  phase: TransitionPhase;
}

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Timeline in ms: cover the screen, hold the scene, reveal the new theme */
export const TIMELINE = {
  wave: { cover: 600, hold: 700, reveal: 560 }
};

export const PALETTE = {
  dark: {
    bg: '#050505',
    ink: '#f5f5f5',
    accent: '#fcd34d',
    muted: 'rgba(245,245,245,0.6)',
    halo: 'rgba(252,211,77,0.1)'
  },
  light: {
    bg: '#f5f3ee',
    ink: '#121212',
    accent: '#f59e0b',
    muted: 'rgba(18,18,18,0.6)',
    halo: 'rgba(245,158,11,0.14)'
  }
};

export function buildStars(seed: number, count = 40) {
  let value = (seed * 9301 + 49297) % 233280;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  return Array.from({ length: count }).map(() => ({
    x: random() * 100,
    y: random() * 100,
    size: random() < 0.8 ? 2 : 3,
    opacity: 0.35 + random() * 0.6,
    delay: random() * 0.35
  }));
}