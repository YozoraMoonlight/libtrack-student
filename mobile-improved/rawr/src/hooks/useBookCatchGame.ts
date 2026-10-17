import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/sound';

export type GameStatus = 'ready' | 'playing' | 'over';

type ItemKind = 'book' | 'gold' | 'slip';

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  rot: number;
  spin: number;
  kind: ItemKind;
  color: string;
}

interface GameState {
  items: FallingItem[];
  basketX: number;
  score: number;
  lives: number;
  last: number;
  lastSpawn: number;
  width: number;
  height: number;
  flash: number;
  ink: string;
}

const BOOK_COLORS = ['#c2410c', '#1e3a5f', '#3f6212', '#0f766e', '#b85c7a', '#6d28d9', '#9f1d20'];
const BEST_KEY = 'libtrack-bookcatch-best';
const MAX_LIVES = 3;
const BASKET_HALF = 44;
const BASKET_HEIGHT = 20;
const BASKET_OFFSET = 60;

export function useBookCatchGame(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const game = useRef<GameState>({
    items: [],
    basketX: 0,
    score: 0,
    lives: MAX_LIVES,
    last: 0,
    lastSpawn: 0,
    width: 0,
    height: 0,
    flash: 0,
    ink: 'rgb(18 18 18)'
  });

  const [status, setStatus] = useState<GameStatus>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [best, setBest] = useState(readBest);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const g = game.current;
    const { width: w, height: h } = g;
    ctx.clearRect(0, 0, w, h);

    if (g.flash > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${g.flash * 0.16})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = withAlpha(g.ink, 0.1);
    ctx.fillRect(0, h - BASKET_OFFSET + BASKET_HEIGHT + 14, w, 1);

    for (const item of g.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      if (item.kind === 'slip') {
        ctx.fillStyle = '#dc2626';
        roundedRect(ctx, -12, -15, 24, 30, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '800 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 1);
      } else {
        ctx.fillStyle = item.color;
        roundedRect(ctx, -13, -17, 26, 34, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(-13, -17, 4, 34);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(11, -15, 2, 30);
        if (item.kind === 'gold') {
          ctx.fillStyle = '#121212';
          ctx.font = '800 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+5', 1, 1);
        }
      }
      ctx.restore();
    }

    const top = h - BASKET_OFFSET;
    ctx.fillStyle = g.ink;
    roundedRect(ctx, g.basketX - BASKET_HALF, top, BASKET_HALF * 2, BASKET_HEIGHT, 6);
    ctx.fill();
    ctx.fillStyle = '#f6b93d';
    ctx.fillRect(g.basketX - BASKET_HALF + 8, top + 5, BASKET_HALF * 2 - 16, 3);
  }, []);

  const tick = useCallback(
    (time: number) => {
      const g = game.current;
      const dt = Math.min(0.05, (time - g.last) / 1000);
      g.last = time;

      const interval = Math.max(330, 820 - g.score * 10);
      if (time - g.lastSpawn > interval) {
        g.lastSpawn = time;
        g.items.push(spawnItem(g.width, g.score));
      }

      const top = g.height - BASKET_OFFSET;
      let scoreDelta = 0;
      let livesLost = 0;
      let caughtGold = false;

      g.items = g.items.filter((item) => {
        item.y += item.vy * dt;
        item.rot += item.spin * dt;
        const bottom = item.y + 17;
        const withinX = Math.abs(item.x - g.basketX) < BASKET_HALF + 10;
        if (bottom >= top && item.y < top + BASKET_HEIGHT && withinX) {
          if (item.kind === 'slip') livesLost += 1;else
          if (item.kind === 'gold') {
            scoreDelta += 5;
            caughtGold = true;
          } else scoreDelta += 1;
          return false;
        }
        if (item.y > g.height + 40) {
          if (item.kind !== 'slip') livesLost += 1;
          return false;
        }
        return true;
      });

      if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 3);

      if (scoreDelta) {
        g.score += scoreDelta;
        setScore(g.score);
        if (caughtGold) sounds.gold();else
        sounds.catch();
      }
      if (livesLost) {
        g.lives = Math.max(0, g.lives - livesLost);
        g.flash = 1;
        setLives(g.lives);
        navigator.vibrate?.(40);
        if (g.lives > 0) sounds.hit();
      }

      draw();

      if (g.lives <= 0) {
        frameRef.current = null;
        sounds.gameOver();
        setStatus('over');
        setBest((current) => {
          const next = Math.max(current, g.score);
          try {
            localStorage.setItem(BEST_KEY, String(next));
          } catch {

            // storage unavailable
          }return next;
        });
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    },
    [draw]
  );

  const start = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const g = game.current;
    const now = performance.now();
    g.items = [];
    g.score = 0;
    g.lives = MAX_LIVES;
    g.flash = 0;
    g.last = now;
    g.lastSpawn = now;
    g.basketX = g.width / 2;
    setScore(0);
    setLives(MAX_LIVES);
    setStatus('playing');
    sounds.start();
    frameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const moveBasket = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const g = game.current;
    g.basketX = clamp(event.clientX - rect.left, BASKET_HALF, g.width - BASKET_HALF);
    if (!frameRef.current) draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = game.current;
      g.width = rect.width;
      g.height = rect.height;
      g.basketX = clamp(g.basketX || rect.width / 2, BASKET_HALF, rect.width - BASKET_HALF);
      g.ink = readInk();
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [active, draw]);

  useEffect(() => {
    if (active) {
      setStatus('ready');
      return;
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    game.current.items = [];
  }, [active]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return { canvasRef, status, score, lives, best, maxLives: MAX_LIVES, start, moveBasket };
}

function spawnItem(width: number, score: number): FallingItem {
  const roll = Math.random();
  const kind: ItemKind = roll < 0.06 ? 'gold' : roll < 0.24 ? 'slip' : 'book';
  return {
    x: 20 + Math.random() * Math.max(0, width - 40),
    y: -24,
    vy: 170 + Math.min(score * 6, 340) + Math.random() * 40,
    rot: (Math.random() - 0.5) * 0.5,
    spin: (Math.random() - 0.5) * 1.6,
    kind,
    color: kind === 'gold' ? '#f6b93d' : BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)]
  };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function readInk() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim();
  return value ? `rgb(${value})` : 'rgb(18 18 18)';
}

function withAlpha(rgb: string, alpha: number) {
  return rgb.replace(')', ` / ${alpha})`);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}