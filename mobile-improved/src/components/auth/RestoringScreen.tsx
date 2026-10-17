/**
 * The cold-start screen shown while the saved session is being restored.
 *
 * This exists because the alternative was wrong twice over. Redirecting straight
 * to `/login` flashed the *sign-in* form at people who were still signed in, and
 * swapping in a plain "Connecting…" line threw away a designed surface. A cold
 * start deserves its own moment: the owl waking up, the library opening.
 *
 * Deliberately position-only animation. A parent that fades opacity while a
 * separately composited, spring-animated SVG sits inside it made Android's
 * WebView composite the two layers out of step, which showed up as the owl
 * ghosting behind the card. No opacity fade on the wrapper, no `will-change`,
 * no `transform-gpu` — just a float.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { OwlMascot } from './OwlMascot';

/** Same spines as the sign-in loader, so the two moments feel like one family. */
const spines = [
  { height: 26, color: 'bg-ink', delay: '0ms' },
  { height: 34, color: 'bg-brand-amber', delay: '120ms' },
  { height: 24, color: 'bg-brand-ember', delay: '240ms' },
  { height: 31, color: 'bg-brand-amberDark', delay: '360ms' },
];

export function RestoringScreen() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream px-8"
    >
      <motion.div
        aria-hidden="true"
        className="w-[104px]"
        initial={reduceMotion ? false : { y: 10 }}
        animate={reduceMotion ? undefined : { y: [10, 0, 10] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <OwlMascot mood="watching" lookProgress={0.4} className="block h-auto w-full" />
      </motion.div>

      <p className="mt-7 text-[19px] font-extrabold tracking-[-0.04em] text-ink">
        Restoring your session
      </p>
      <p className="mt-1 text-[14px] text-ink/55">Opening your library…</p>

      <div className="mt-7 flex h-8 items-end gap-1.5" aria-hidden="true">
        {spines.map((spine) => (
          <span
            key={spine.delay}
            className={`book-spine block w-3 rounded-[3px] ${spine.color}`}
            style={{ height: spine.height, animationDelay: spine.delay }}
          />
        ))}
      </div>
    </div>
  );
}