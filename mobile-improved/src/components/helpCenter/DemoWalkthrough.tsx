import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon, RotateCcwIcon } from 'lucide-react';
import type { DemoWalkthrough as Walkthrough } from '../../data/helpCenter';
import { cn } from '../../utils/cn';

interface DemoWalkthroughProps {
  demo: Walkthrough;
  screens: Array<() => React.ReactElement>;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function DemoWalkthrough({ demo, screens }: DemoWalkthroughProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const total = demo.steps.length;
  const isLast = step === total - 1;
  const current = demo.steps[step];

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total || next === step) return;
      setStep(next);
    },
    [total, step]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(step + 1);
      if (e.key === 'ArrowLeft') go(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, step]);

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-paper">
      <div className="flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-1 bg-paper px-2 pb-1 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <Link
            to="/app/help"
            state={{ sheet: 'demos' }}
            aria-label="Back to product demos"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 active:scale-[0.92] active:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
            <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
          <p className="text-[14px] text-ink/55">Product demos</p>
        </header>

        <main className="flex flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.045em] text-ink">{demo.title}</h1>
          <p className="mt-1 text-[14px] text-ink/55">{demo.summary}</p>

          {/* Simulated app screen with the step's focus spotlighted */}
          <motion.div
            className="relative mx-auto mt-5 h-[390px] w-full max-w-[300px] touch-pan-y overflow-hidden rounded-[28px] bg-paper ring-[6px] ring-ink/90"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(step + 1);
              if (info.offset.x > 50) go(step - 1);
            }}
            aria-label={`Demo screen, step ${step + 1}: ${current.title}`}
            role="img">
            
            {/*
               One slide at a time, swapped with mode="wait" so the outgoing
               screen is fully gone before the next one arrives. Overlapping two
               slides stacked two dim layers and two offset spotlight rings,
               which read as a flicker on every step change. The gap is
               invisible because both the stage and each screen are bg-paper.
              */}
            <AnimatePresence mode="wait" initial={false}>
              {(() => {
                const StepScreen = screens[step];
                return (
                  <motion.div
                    key={step}
                    className="absolute inset-0"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.14, ease }}
                    aria-label={`Demo screen, step ${step + 1}: ${current.title}`}>
                    
                    <StepScreen />
                    <div className="pointer-events-none absolute inset-0 z-10 bg-[#1c1917]/45" aria-hidden="true" />
                  </motion.div>);

              })()}
            </AnimatePresence>
          </motion.div>

          <section className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-ink/[0.07]" aria-live="polite">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-brand-ember">
              Step {step + 1} of {total}
            </p>
            <h2 className="mt-1 text-[19px] font-bold tracking-[-0.02em] text-ink">{current.title}</h2>
            <p className="mt-1.5 min-h-[4.5rem] text-[15px] leading-6 text-ink/65">{current.text}</p>

            <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
              {demo.steps.map((s, i) =>
              <span
                key={s.title}
                className={cn(
                  'h-1.5 rounded-full transition-[width,background-color] duration-200',
                  i === step ? 'w-5 bg-brand-amber' : 'w-1.5 bg-ink/15'
                )} />

              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0}
                className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              {isLast ?
              <button
                type="button"
                onClick={() => go(0)}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                
                  <RotateCcwIcon className="h-4 w-4" aria-hidden="true" />
                  Watch again
                </button> :

              <button
                type="button"
                onClick={() => go(step + 1)}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-ink text-[15px] font-semibold text-paper transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:ring-offset-2">
                
                  Next
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            </div>

            {isLast ?
            <button
              type="button"
              onClick={() => navigate(demo.cta.to)}
              className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-amber text-[15px] font-semibold text-[#1c1917] transition-[background-color,transform] duration-150 hover:bg-brand-amberDark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ember focus-visible:ring-offset-2">
              
                {demo.cta.label}
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </button> :
            null}

            <p className="mt-3 text-[12px] text-ink/45">Tip: swipe the screen to move between steps.</p>
          </section>
        </main>
      </div>
    </div>);

}