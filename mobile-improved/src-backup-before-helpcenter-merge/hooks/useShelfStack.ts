import { useCallback, useEffect, useReducer, useRef } from 'react';
import { sounds } from '../utils/sound';

export const COLS = 10;
export const ROWS = 20;
export const BOOK_COLORS = ['#c2410c', '#1e3a5f', '#3f6212', '#0f766e', '#b85c7a', '#6d28d9', '#f6b93d'];

export type StackStatus = 'ready' | 'playing' | 'paused' | 'over';
type Shape = number[][];

interface Piece {
  kind: number;
  shape: Shape;
  x: number;
  y: number;
}

interface StackState {
  board: number[][];
  piece: Piece | null;
  next: number;
  bag: number[];
  hold: number | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  status: StackStatus;
  clearing: number[];
  best: number;
}

export const SHAPES: Shape[] = [
[[1, 1, 1, 1]],
[
[1, 1],
[1, 1]],

[
[0, 1, 0],
[1, 1, 1]],

[
[0, 1, 1],
[1, 1, 0]],

[
[1, 1, 0],
[0, 1, 1]],

[
[1, 0, 0],
[1, 1, 1]],

[
[0, 0, 1],
[1, 1, 1]]];



const LINE_POINTS = [0, 100, 300, 500, 800];
const BEST_KEY = 'libtrack-shelfstack-best';
const CLEAR_MS = 160;

export function useShelfStack(active: boolean) {
  const [, render] = useReducer((n: number) => n + 1, 0);
  const g = useRef<StackState>(initialState());
  const timer = useRef<number | undefined>(undefined);
  const loopRef = useRef<() => void>(() => undefined);

  const stopLoop = () => window.clearInterval(timer.current);
  const canAct = () => {
    const s = g.current;
    return s.status === 'playing' && !!s.piece && !s.clearing.length;
  };

  const endGame = useCallback(() => {
    const s = g.current;
    s.piece = null;
    s.status = 'over';
    stopLoop();
    if (s.score > s.best) {
      s.best = s.score;
      writeBest(s.score);
    }
    sounds.gameOver();
    navigator.vibrate?.([30, 40, 60]);
  }, []);

  /** Place a piece of the given kind at the top. Returns false if it doesn't fit (game over). */
  const place = useCallback(
    (kind: number) => {
      const s = g.current;
      const shape = SHAPES[kind];
      const piece: Piece = { kind, shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
      if (collides(s.board, piece.shape, piece.x, piece.y)) {
        endGame();
        return false;
      }
      s.piece = piece;
      return true;
    },
    [endGame]
  );

  const spawn = useCallback(() => {
    const s = g.current;
    if (!s.bag.length) s.bag = shuffledBag();
    const kind = s.next;
    s.next = s.bag.pop() as number;
    s.canHold = true;
    place(kind);
  }, [place]);

  const lock = useCallback(() => {
    const s = g.current;
    const piece = s.piece;
    if (!piece) return;
    piece.shape.forEach((row, dy) =>
    row.forEach((cell, dx) => {
      if (cell && piece.y + dy >= 0) s.board[piece.y + dy][piece.x + dx] = piece.kind + 1;
    })
    );
    s.piece = null;
    const full = s.board.map((row, i) => row.every(Boolean) ? i : -1).filter((i) => i >= 0);
    if (!full.length) {
      sounds.tap(-2);
      spawn();
      render();
      return;
    }
    s.clearing = full;
    if (full.length === 4) {
      sounds.reveal();
      navigator.vibrate?.([15, 30, 15, 30, 40]);
    } else {
      sounds.gold();
      navigator.vibrate?.(12);
    }
    render();
    window.setTimeout(() => {
      const st = g.current;
      if (st.status === 'over' || st.status === 'ready') return;
      st.board = st.board.filter((_, i) => !full.includes(i));
      while (st.board.length < ROWS) st.board.unshift(Array(COLS).fill(0));
      st.lines += full.length;
      st.score += LINE_POINTS[full.length] * st.level;
      const nextLevel = Math.floor(st.lines / 10) + 1;
      const levelled = nextLevel !== st.level;
      st.level = nextLevel;
      st.clearing = [];
      spawn();
      if (levelled && st.status === 'playing') loopRef.current();
      render();
    }, CLEAR_MS);
  }, [spawn]);

  const step = useCallback(() => {
    if (!canAct()) return;
    const s = g.current;
    const piece = s.piece as Piece;
    if (!collides(s.board, piece.shape, piece.x, piece.y + 1)) {
      s.piece = { ...piece, y: piece.y + 1 };
      render();
    } else {
      lock();
    }
  }, [lock]);

  const startLoop = useCallback(() => {
    stopLoop();
    const speed = Math.max(90, 800 - (g.current.level - 1) * 70);
    timer.current = window.setInterval(step, speed);
  }, [step]);
  loopRef.current = startLoop;

  const start = useCallback(() => {
    const best = g.current.best;
    g.current = { ...initialState(), best, status: 'playing' };
    spawn();
    sounds.start();
    startLoop();
    render();
  }, [spawn, startLoop]);

  const move = useCallback((dx: number) => {
    if (!canAct()) return false;
    const s = g.current;
    const piece = s.piece as Piece;
    if (collides(s.board, piece.shape, piece.x + dx, piece.y)) return false;
    s.piece = { ...piece, x: piece.x + dx };
    sounds.tap();
    render();
    return true;
  }, []);

  const rotate = useCallback((direction: 1 | -1 = 1) => {
    if (!canAct()) return;
    const s = g.current;
    const piece = s.piece as Piece;
    const rotated = direction === 1 ? rotateCw(piece.shape) : rotateCcw(piece.shape);
    for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
      if (!collides(s.board, rotated, piece.x + kx, piece.y + ky)) {
        s.piece = { ...piece, shape: rotated, x: piece.x + kx, y: piece.y + ky };
        sounds.tap(2);
        render();
        return;
      }
    }
  }, []);

  const softDrop = useCallback(() => {
    if (!canAct()) return;
    const s = g.current;
    const piece = s.piece as Piece;
    if (!collides(s.board, piece.shape, piece.x, piece.y + 1)) {
      s.piece = { ...piece, y: piece.y + 1 };
      s.score += 1;
      render();
    } else {
      lock();
    }
  }, [lock]);

  const hardDrop = useCallback(() => {
    if (!canAct()) return;
    const s = g.current;
    const piece = s.piece as Piece;
    const y = ghostY(s.board, piece);
    s.score += (y - piece.y) * 2;
    s.piece = { ...piece, y };
    navigator.vibrate?.(10);
    lock();
  }, [lock]);

  /** Stash the current book for later, or swap it with the one already on hold. Once per piece. */
  const hold = useCallback(() => {
    if (!canAct()) return;
    const s = g.current;
    if (!s.canHold) {
      navigator.vibrate?.([6, 30, 6]);
      return;
    }
    const current = (s.piece as Piece).kind;
    const stored = s.hold;
    s.hold = current;
    s.canHold = false;
    if (stored === null) {
      if (!s.bag.length) s.bag = shuffledBag();
      const kind = s.next;
      s.next = s.bag.pop() as number;
      place(kind);
    } else {
      place(stored);
    }
    sounds.smug();
    startLoop();
    render();
  }, [place, startLoop]);

  const pause = useCallback(() => {
    if (g.current.status !== 'playing') return;
    g.current.status = 'paused';
    stopLoop();
    render();
  }, []);

  const resume = useCallback(() => {
    if (g.current.status !== 'paused') return;
    g.current.status = 'playing';
    startLoop();
    render();
  }, [startLoop]);

  // Pause when the game closes or the app goes to the background
  useEffect(() => {
    if (!active) pause();
  }, [active, pause]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stopLoop();
    };
  }, [pause]);

  const s = g.current;
  const cells = s.board.map((row) => [...row]);
  const ghost: Array<[number, number]> = [];
  if (s.piece) {
    const piece = s.piece;
    const gy = ghostY(s.board, piece);
    piece.shape.forEach((row, dy) =>
    row.forEach((cell, dx) => {
      if (!cell) return;
      if (gy + dy >= 0) ghost.push([gy + dy, piece.x + dx]);
      if (piece.y + dy >= 0) cells[piece.y + dy][piece.x + dx] = piece.kind + 1;
    })
    );
  }

  return {
    cells,
    ghost,
    clearing: s.clearing,
    next: s.next,
    hold: s.hold,
    canHold: s.canHold,
    score: s.score,
    lines: s.lines,
    level: s.level,
    best: s.best,
    status: s.status,
    start,
    move,
    rotate,
    softDrop,
    hardDrop,
    holdPiece: hold,
    pause,
    resume
  };
}

function initialState(): StackState {
  const bag = shuffledBag();
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: null,
    next: bag.pop() as number,
    bag,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    status: 'ready',
    clearing: [],
    best: readBest()
  };
}

function shuffledBag() {
  const bag = SHAPES.map((_, i) => i);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function collides(board: number[][], shape: Shape, x: number, y: number) {
  return shape.some((row, dy) =>
  row.some((cell, dx) => {
    if (!cell) return false;
    const bx = x + dx;
    const by = y + dy;
    if (bx < 0 || bx >= COLS || by >= ROWS) return true;
    return by >= 0 && board[by][bx] !== 0;
  })
  );
}

function rotateCw(shape: Shape): Shape {
  return shape[0].map((_, col) => shape.map((row) => row[col]).reverse());
}

function rotateCcw(shape: Shape): Shape {
  return shape[0].map((_, col) => shape.map((row) => row[row.length - 1 - col]));
}

function ghostY(board: number[][], piece: Piece) {
  let y = piece.y;
  while (!collides(board, piece.shape, piece.x, y + 1)) y++;
  return y;
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value: number) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {

    // storage unavailable
  }}