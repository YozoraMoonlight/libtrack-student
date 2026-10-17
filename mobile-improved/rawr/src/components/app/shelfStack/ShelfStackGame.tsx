import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownIcon,
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsDownIcon,
  PauseIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon } from
'lucide-react';
import { BOOK_COLORS, COLS, ROWS, useShelfStack } from '../../../hooks/useShelfStack';
import { isSoundMuted, setSoundMuted, sounds } from '../../../utils/sound';
import { BookCell } from './BookCell';
import { ControlButton } from './ControlButton';
import { PiecePreview } from './PiecePreview';

interface ShelfStackGameProps {
  open: boolean;
  onClose: () => void;
}

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  anchorX: number;
  anchorY: number;
  t: number;
  moved: boolean;
}

const BOARD_PAD = 6;

export function ShelfStackGame({ open, onClose }: ShelfStackGameProps) {
  const game = useShelfStack(open);
  const [muted, setMuted] = useState(isSoundMuted);
  const [cell, setCell] = useState(18);
  const areaRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const ghostSet = new Set(game.ghost.map(([r, c]) => `${r}-${c}`));
  const clearingSet = new Set(game.clearing);
  const shelfTris = game.clearing.length === 4;

  // Size the board to the largest crisp cell that fits the space left between header and controls
  useLayoutEffect(() => {
    if (!open) return;
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const size = Math.floor(Math.min((width - BOARD_PAD * 2) / COLS, (height - BOARD_PAD * 2) / ROWS));
      setCell(Math.max(12, size));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  // Lock page scroll + Android back button closes the game instead of leaving the page
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let closedByBack = false;
    window.history.pushState({ shelfStack: true }, '');
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      const g = gameRef.current;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => g.move(-1),
        ArrowRight: () => g.move(1),
        ArrowDown: g.softDrop,
        ArrowUp: () => g.rotate(1),
        z: () => g.rotate(-1),
        x: () => g.rotate(1),
        c: g.holdPiece,
        ' ': g.hardDrop
      };
      if (event.key === 'Escape') return closeRef.current();
      if (event.key === 'p') return g.status === 'paused' ? g.resume() : g.pause();
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      if (!closedByBack && window.history.state?.shelfStack) window.history.back();
    };
  }, [open]);

  function toggleMute() {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    if (!next) sounds.tap();
  }

  /*
   * Board gestures, tuned for thumbs:
   * drag sideways → piece follows your finger one column at a time
   * drag down slowly → soft drop · flick down → hard drop
   * flick up → hold · tap → rotate (left half counter-clockwise, right half clockwise)
   */
  function onBoardDown(event: React.PointerEvent<HTMLDivElement>) {
    if (gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      anchorX: event.clientX,
      anchorY: event.clientY,
      t: performance.now(),
      moved: false
    };
  }

  function onBoardMove(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const stepX = cell * 0.9;
    while (event.clientX - g.anchorX >= stepX) {
      game.move(1);
      g.anchorX += stepX;
      g.moved = true;
    }
    while (g.anchorX - event.clientX >= stepX) {
      game.move(-1);
      g.anchorX -= stepX;
      g.moved = true;
    }
    const totalDx = Math.abs(event.clientX - g.startX);
    const stepY = cell * 1.1;
    while (event.clientY - g.anchorY >= stepY && event.clientY - g.startY > totalDx) {
      game.softDrop();
      g.anchorY += stepY;
      g.moved = true;
    }
  }

  function onBoardUp(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    const elapsed = performance.now() - g.t;
    const velocityY = dy / Math.max(elapsed, 1);

    if (dy > cell * 2 && velocityY > 0.9 && Math.abs(dy) > Math.abs(dx)) {
      game.hardDrop();
    } else if (dy < -cell * 2 && elapsed < 350 && Math.abs(dy) > Math.abs(dx)) {
      game.holdPiece();
    } else if (!g.moved && Math.abs(dx) < 10 && Math.abs(dy) < 10 && elapsed < 280) {
      const rect = event.currentTarget.getBoundingClientRect();
      game.rotate(event.clientX < rect.left + rect.width / 2 ? -1 : 1);
    }
  }

  const boardWidth = cell * COLS + BOARD_PAD * 2;
  const boardHeight = cell * ROWS + BOARD_PAD * 2;
  const playing = game.status === 'playing';

  return (
    <AnimatePresence>
      {open ?
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelfstack-title"
        className="fixed inset-0 z-[60] flex touch-none select-none flex-col overscroll-none bg-paper [-webkit-touch-callout:none]"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
        
          <header className="flex items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <h2 id="shelfstack-title" className="text-[15px] font-extrabold tracking-[-0.03em] text-ink">
                Shelf Stack
              </h2>
              <p className="text-[11px] font-semibold text-brand-ember">Secret mini-game</p>
            </div>
            <p className="mr-1 text-2xl font-extrabold tabular-nums tracking-[-0.04em] text-ink" aria-live="polite">
              {game.score}
            </p>
            {playing ?
          <button
            type="button"
            onClick={game.pause}
            aria-label="Pause"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
                <PauseIcon className="h-5 w-5" aria-hidden="true" />
              </button> :
          null}
            <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Turn sound on' : 'Mute sound'}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
              {muted ? <VolumeXIcon className="h-5 w-5" aria-hidden="true" /> : <Volume2Icon className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button
            type="button"
            onClick={onClose}
            aria-label="Close game"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {/* Play area: Hold | Board | Next + stats */}
          <div className="flex min-h-0 flex-1 gap-2 px-3">
            <aside className="w-[60px] shrink-0 pt-1">
              <PiecePreview label="Hold" kind={game.hold} dimmed={!game.canHold} />
            </aside>

            <div ref={areaRef} className="flex min-w-0 flex-1 items-start justify-center">
              <div
              className="relative rounded-xl bg-white ring-1 ring-ink/[0.08]"
              style={{ width: boardWidth, height: boardHeight, padding: BOARD_PAD }}
              onPointerDown={onBoardDown}
              onPointerMove={onBoardMove}
              onPointerUp={onBoardUp}
              onPointerCancel={() => gesture.current = null}
              aria-label="Shelf. Tap to rotate, drag to move, flick down to drop, flick up to hold.">
              
                <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, width: cell * COLS, height: cell * ROWS }}>
                
                  {game.cells.map((row, r) =>
                row.map((value, c) =>
                <BookCell
                  key={`${r}-${c}`}
                  color={value ? BOOK_COLORS[value - 1] : undefined}
                  ghost={!value && ghostSet.has(`${r}-${c}`)}
                  flash={clearingSet.has(r)} />

                )
                )}
                </div>

                <AnimatePresence>
                  {shelfTris ?
                <motion.p
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-2xl font-extrabold tracking-[-0.04em] text-brand-ember">
                  
                      SHELF-TRIS!
                    </motion.p> :
                null}
                </AnimatePresence>

                {!playing ?
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-paper/75 px-3"
                onPointerDown={(event) => event.stopPropagation()}>
                
                    <motion.div
                  key={game.status}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="w-full rounded-2xl bg-white p-4 text-center shadow-card ring-1 ring-ink/[0.06]">
                  
                      {game.status === 'ready' ?
                  <>
                          <p className="text-lg font-extrabold leading-tight tracking-[-0.03em] text-ink">Tidy the shelves</p>
                          <ul className="mt-2 space-y-1 text-left text-[12px] leading-4 text-ink/65">
                            <li><b className="text-ink">Tap</b> to rotate</li>
                            <li><b className="text-ink">Drag</b> to move</li>
                            <li><b className="text-ink">Flick down</b> to drop</li>
                            <li><b className="text-ink">Flick up</b> to hold</li>
                          </ul>
                        </> :
                  game.status === 'paused' ?
                  <p className="text-lg font-extrabold tracking-[-0.03em] text-ink">Paused</p> :

                  <>
                          <p className="text-sm font-semibold text-brand-ember">Shelves full</p>
                          <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-[-0.05em] text-ink">{game.score}</p>
                          <p className="mt-1 text-[13px] text-ink/55">
                            {game.score > 0 && game.score >= game.best ? 'New best score!' : `Best ${game.best}`}
                          </p>
                        </>
                  }
                      <button
                    type="button"
                    onClick={game.status === 'paused' ? game.resume : game.start}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-amber text-[15px] font-bold text-[#121212] transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] active:bg-brand-amberDark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40">
                    
                        {game.status === 'over' ? <RotateCcwIcon className="h-4 w-4" aria-hidden="true" /> : null}
                        {game.status === 'over' ? 'Play again' : game.status === 'paused' ? 'Resume' : 'Start'}
                      </button>
                      {game.status !== 'ready' ?
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-1.5 h-10 w-full rounded-xl text-sm font-semibold text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                    
                          Back to library
                        </button> :
                  null}
                    </motion.div>
                  </div> :
              null}
              </div>
            </div>

            <aside className="flex w-[60px] shrink-0 flex-col gap-4 pt-1">
              <PiecePreview label="Next" kind={game.next} />
              <dl className="space-y-2.5 text-center">
                <div>
                  <dt className="text-[11px] font-bold text-ink/50">Level</dt>
                  <dd className="text-lg font-extrabold tabular-nums tracking-[-0.03em] text-ink">{game.level}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-ink/50">Shelved</dt>
                  <dd className="text-lg font-extrabold tabular-nums tracking-[-0.03em] text-ink">{game.lines}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-ink/50">Best</dt>
                  <dd className="text-sm font-bold tabular-nums text-ink/70">{game.best}</dd>
                </div>
              </dl>
            </aside>
          </div>

          {/* Gamepad: movement under the left thumb, actions under the right */}
          <div className="flex items-end justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="grid w-[152px] grid-cols-2 gap-2">
              <ControlButton label="Soft drop" onPress={game.softDrop} repeat tone="muted" className="col-span-2 h-11 rounded-xl">
                <ArrowDownIcon className="h-5 w-5" aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Move left" onPress={() => game.move(-1)} repeat className="h-[68px] rounded-2xl">
                <ChevronLeftIcon className="h-8 w-8" aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Move right" onPress={() => game.move(1)} repeat className="h-[68px] rounded-2xl">
                <ChevronRightIcon className="h-8 w-8" aria-hidden="true" />
              </ControlButton>
            </div>

            <div className="grid w-[152px] grid-cols-2 gap-2">
              <ControlButton
              label="Hold book"
              onPress={game.holdPiece}
              tone="muted"
              disabled={playing && !game.canHold}
              className="col-span-2 h-11 gap-1.5 rounded-xl text-[13px] font-bold">
              
                <ArchiveIcon className="h-4 w-4" aria-hidden="true" />
                Hold
              </ControlButton>
              <ControlButton label="Rotate" onPress={() => game.rotate(1)} className="h-[68px] rounded-full">
                <RotateCwIcon className="h-7 w-7" aria-hidden="true" />
              </ControlButton>
              <ControlButton label="Hard drop" onPress={game.hardDrop} tone="primary" className="h-[68px] rounded-full">
                <ChevronsDownIcon className="h-8 w-8" aria-hidden="true" />
              </ControlButton>
            </div>
          </div>
        </motion.div> :
      null}
    </AnimatePresence>);

}