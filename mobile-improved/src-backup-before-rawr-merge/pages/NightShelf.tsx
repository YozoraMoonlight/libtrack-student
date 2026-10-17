import React, { useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type Variants } from
'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, RotateCcwIcon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { NightShelfCard } from '../components/app/NightShelfCard';
import { NIGHT_SHELF_KEY } from '../components/app/SecretMoon';
import { nightShelf } from '../data/nightShelf';
import { sounds } from '../utils/sound';

const CARD_WIDTH = 230;
const GAP = 16;
const STEP = CARD_WIDTH + GAP;
const ease = [0.23, 1, 0.32, 1] as const;

const detailVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -20 })
};

export function NightShelf() {
  if (sessionStorage.getItem(NIGHT_SHELF_KEY) !== '1') {
    return <Navigate to="/app/browse" replace />;
  }
  return <NightShelfContent />;
}

function NightShelfContent() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const scrollX = useMotionValue(0);
  const glide = useRef<AnimationPlaybackControls | null>(null);
  const selected = nightShelf[index];
  const isLast = index === nightShelf.length - 1;

  function handleScroll() {
    const el = scroller.current;
    if (!el) return;
    scrollX.set(el.scrollLeft);
    const next = Math.min(nightShelf.length - 1, Math.max(0, Math.round(el.scrollLeft / STEP)));
    if (next !== index) {
      setDirection(next > index ? 1 : -1);
      setIndex(next);
      sounds.tap(next);
      navigator.vibrate?.(8);
    }
  }

  function goTo(next: number) {
    const el = scroller.current;
    if (!el) return;
    const target = next * STEP;
    glide.current?.stop();
    if (reduceMotion) {
      el.scrollLeft = target;
      return;
    }
    // Glide with our own curve; pause snapping so the browser doesn't fight it
    el.style.scrollSnapType = 'none';
    const distance = Math.abs(target - el.scrollLeft) / STEP;
    glide.current = animate(el.scrollLeft, target, {
      duration: Math.min(0.55, 0.3 + distance * 0.05),
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => {
        el.scrollLeft = v;
      },
      onComplete: () => {
        el.style.scrollSnapType = '';
      }
    });
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full justify-center overflow-hidden bg-[#08080b]">
      {/* Blurred poster backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.img
            key={selected.id}
            src={selected.cover}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }} />
          
        </AnimatePresence>
        <div className="absolute inset-0 bg-[#08080b]/60" />
      </div>

      <main className="relative flex min-h-[100dvh] w-full max-w-[430px] flex-col pb-[max(2rem,env(safe-area-inset-bottom))] text-[#f5f3f7]">
        <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => navigate('/app/browse')}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#f5f3f7]/70 transition-colors duration-150 ease-out hover:text-[#f5f3f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <p className="pr-4 text-[13px] font-semibold tabular-nums text-[#f5f3f7]/50">
            {index + 1} / {nightShelf.length}
          </p>
        </header>

        <div className="px-6 pt-3">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.045em]">The back room</h1>
          <p className="mt-1 text-sm text-[#f5f3f7]/55">Five series the developer keeps off the main shelf.</p>
        </div>

        {/* Poster carousel */}
        <section aria-label="Series" aria-roledescription="carousel" className="mt-6">
          <div
            ref={scroller}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingInline: `calc(50% - ${CARD_WIDTH / 2}px)`, perspective: 900 }}>
            
            {nightShelf.map((book, i) =>
            <NightShelfCard
              key={book.id}
              book={book}
              index={i}
              step={STEP}
              width={CARD_WIDTH}
              scrollX={scrollX}
              active={i === index}
              reduceMotion={!!reduceMotion}
              onSelect={() => goTo(i)} />

            )}
          </div>

          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Choose series">
            {nightShelf.map((book, i) =>
            <button
              key={book.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={book.title}
              onClick={() => goTo(i)}
              className="flex h-6 items-center px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                <span
                className="block h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out"
                style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? book.accent : 'rgba(245,243,247,0.3)' }} />
              
              </button>
            )}
          </div>
        </section>

        {/* Details */}
        <section aria-live="polite" className="mt-5 flex-1 px-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.article
              key={selected.id}
              custom={direction}
              variants={detailVariants}
              initial={reduceMotion ? false : 'enter'}
              animate="center"
              exit={reduceMotion ? undefined : 'exit'}
              transition={{ duration: 0.2, ease }}>
              
              <p className="text-[13px] font-semibold" style={{ color: selected.accent }}>
                {selected.category} · {selected.volumes} {selected.volumes === 1 ? 'volume' : 'volumes'} · {selected.genre}
              </p>
              <h2 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-[-0.04em]">{selected.title}</h2>
              <p className="mt-0.5 text-sm text-[#f5f3f7]/55">{selected.author}</p>

              <p className="mt-4 text-[16px] leading-7 text-[#f5f3f7]/90">“{selected.note}”</p>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#f5f3f7]/10 pt-4">
                <p className="text-sm text-[#f5f3f7]/50">A personal pick, not in the catalog.</p>
                <button
                  type="button"
                  onClick={() => goTo(isLast ? 0 : index + 1)}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#f5f3f7] px-4 text-sm font-bold text-[#121212] transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                  
                  {isLast ? 'Start over' : 'Next pick'}
                  {isLast ?
                  <RotateCcwIcon aria-hidden="true" className="h-4 w-4" /> :

                  <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                  }
                </button>
              </div>
            </motion.article>
          </AnimatePresence>
        </section>

        <p className="mt-8 text-center text-xs text-[#f5f3f7]/30">Keep this one between us.</p>
      </main>
    </div>);

}