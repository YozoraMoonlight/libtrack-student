import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HeartIcon, RotateCcwIcon, Volume2Icon, VolumeXIcon, XIcon } from 'lucide-react';
import { useBookCatchGame } from '../../hooks/useBookCatchGame';
import { isSoundMuted, setSoundMuted, sounds } from '../../utils/sound';

interface BookCatchGameProps {
  open: boolean;
  onClose: () => void;
}

export function BookCatchGame({ open, onClose }: BookCatchGameProps) {
  const { canvasRef, status, score, lives, best, maxLives, start, moveBasket } = useBookCatchGame(open);
  const [muted, setMuted] = useState(isSoundMuted);

  function toggleMute() {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    if (!next) sounds.tap();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ?
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookcatch-title"
        className="fixed inset-0 z-[60] flex flex-col bg-paper"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
        
          <header className="flex items-center justify-between px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
            <div>
              <h2 id="bookcatch-title" className="text-[15px] font-extrabold tracking-[-0.03em] text-ink">
                Book Catch
              </h2>
              <p className="text-[11px] font-semibold text-brand-ember">Secret mini-game</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-0.5" aria-label={`${lives} of ${maxLives} lives left`}>
                {Array.from({ length: maxLives }, (_, index) =>
              <HeartIcon
                key={index}
                aria-hidden="true"
                className={index < lives ? 'h-[18px] w-[18px] fill-red-500 text-red-500' : 'h-[18px] w-[18px] text-ink/20'} />

              )}
              </div>
              <p className="min-w-[2ch] text-right text-2xl font-extrabold tabular-nums tracking-[-0.04em] text-ink" aria-live="polite">
                {score}
              </p>
              <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Turn sound on' : 'Mute sound'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                {muted ? <VolumeXIcon className="h-5 w-5" aria-hidden="true" /> : <Volume2Icon className="h-5 w-5" aria-hidden="true" />}
              </button>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close game"
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                <XIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="relative flex-1 pb-[env(safe-area-inset-bottom)]">
            <canvas
            ref={canvasRef}
            onPointerDown={moveBasket}
            onPointerMove={moveBasket}
            className="block h-full w-full touch-none select-none"
            aria-label="Game area. Drag left and right to move the book cart." />
          

            {status !== 'playing' ?
          <div className="absolute inset-0 flex items-center justify-center px-8">
                <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-[320px] rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-ink/[0.06]">
              
                  {status === 'ready' ?
              <>
                      <p className="text-xl font-extrabold tracking-[-0.03em] text-ink">Returns are raining in</p>
                      <p className="mt-2 text-sm leading-5 text-ink/60">
                        Drag the cart to catch falling books. Dodge the red overdue slips. Drop 3 and the library closes.
                      </p>
                      <ul className="mt-4 flex justify-center gap-4 text-xs font-semibold text-ink/70">
                        <li className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-4 w-3 rounded-[2px] bg-[#1e3a5f]" />
                          +1
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-4 w-3 rounded-[2px] bg-brand-amber" />
                          +5
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-4 w-3 rounded-[2px] bg-red-600" />
                          Lose a life
                        </li>
                      </ul>
                    </> :

              <>
                      <p className="text-sm font-semibold text-brand-ember">Closing time</p>
                      <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-[-0.05em] text-ink">{score}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        {score > 0 && score >= best ? 'New best score!' : `Best ${best}`}
                      </p>
                    </>
              }
                  <button
                type="button"
                onClick={start}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-amber text-[15px] font-bold text-[#121212] transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] active:bg-brand-amberDark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40">
                
                    {status === 'over' ? <RotateCcwIcon className="h-4 w-4" aria-hidden="true" /> : null}
                    {status === 'over' ? 'Play again' : 'Start'}
                  </button>
                  {status === 'over' ?
              <button
                type="button"
                onClick={onClose}
                className="mt-2 h-10 w-full rounded-xl text-sm font-semibold text-ink/60 active:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                
                      Back to library
                    </button> :
              null}
                </motion.div>
              </div> :
          null}
          </div>
        </motion.div> :
      null}
    </AnimatePresence>);

}