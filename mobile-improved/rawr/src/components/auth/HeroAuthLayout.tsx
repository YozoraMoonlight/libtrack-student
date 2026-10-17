import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { AppIcon } from '../app/AppIcon';
import { Bookshelf } from './Bookshelf';
import { CreatorReveal } from './CreatorReveal';
import { MoonlitSky } from './MoonlitSky';
import { sounds } from '../../utils/sound';
import { ThemeToggle } from '../app/ThemeToggle';

interface HeroAuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSecretBook?: () => void;
  /** Show the moonlit sky (stars + crescent moon) behind the heading */
  night?: boolean;
}

const ease = [0.23, 1, 0.32, 1] as const;
// Secret: tap the logo 8 times, then press and hold it for 1s
const REVEAL_TAPS = 8;
const TAP_WINDOW_MS = 900;
const HOLD_MS = 1000;
const ARM_WINDOW_MS = 5000;

export function HeroAuthLayout({ title, subtitle, children, onSecretBook, night = false }: HeroAuthLayoutProps) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const [revealOpen, setRevealOpen] = useState(false);
  const taps = useRef(0);
  const resetTimer = useRef<number | undefined>(undefined);
  const armTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const armed = useRef(false);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
      window.clearTimeout(armTimer.current);
      window.clearTimeout(holdTimer.current);
    },
    []
  );

  function handlePressStart() {
    if (!armed.current) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      armed.current = false;
      window.clearTimeout(armTimer.current);
      suppressClick.current = true;
      sounds.reveal();
      navigator.vibrate?.([30, 40, 60]);
      setRevealOpen(true);
    }, HOLD_MS);
  }

  function handlePressEnd() {
    window.clearTimeout(holdTimer.current);
  }

  function handleLogoTap() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }

    // A short tap while armed breaks the sequence
    if (armed.current) {
      armed.current = false;
      window.clearTimeout(armTimer.current);
      taps.current = 0;
    }

    taps.current += 1;
    window.clearTimeout(resetTimer.current);

    if (taps.current >= REVEAL_TAPS) {
      taps.current = 0;
      armed.current = true;
      armTimer.current = window.setTimeout(() => {
        armed.current = false;
      }, ARM_WINDOW_MS);
      sounds.tap(REVEAL_TAPS);
      navigator.vibrate?.(15);
      // Subtle hint that something is waiting: a small pulse
      if (!reduceMotion) {
        void controls.start({
          scale: [1, 1.08, 1],
          transition: { duration: 0.24, ease: 'easeOut' }
        });
      }
      return;
    }

    sounds.tap(taps.current);
    if (!reduceMotion) {
      void controls.start({
        rotate: [0, -8, 8, 0],
        scale: [1, 0.92, 1],
        transition: { duration: 0.2, ease: 'easeOut' }
      });
    }
    resetTimer.current = window.setTimeout(() => {
      taps.current = 0;
    }, TAP_WINDOW_MS);
  }

  return (
    <main className="flex min-h-[100dvh] w-full justify-center bg-cream">
      <section
        aria-label="LIBTRACK student account"
        className="flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-cream pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        
        <motion.div
          className="flex flex-1 flex-col justify-center px-6 pb-8"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease }}>
          
          <div className="flex items-center gap-2.5">
            <motion.button
              type="button"
              onClick={handleLogoTap}
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onContextMenu={(event) => event.preventDefault()}
              aria-label="LIBTRACK"
              animate={controls}
              style={{ WebkitTouchCallout: 'none' }}
              className="select-none rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ember">
              
              <AppIcon size="md" />
            </motion.button>
            <p className="flex-1 text-[19px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</p>
            <ThemeToggle />
          </div>

          <div className="relative mb-7 mt-8">
            {night ? <MoonlitSky /> : null}
            <h1 className="relative text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">{title}</h1>
            {subtitle ? <p className="relative mt-2 text-[15px] leading-6 text-ink/55">{subtitle}</p> : null}
          </div>

          {children}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease, delay: 0.08 }}>
          
          <Bookshelf onSecretBook={onSecretBook} />
        </motion.div>
      </section>
      <CreatorReveal open={revealOpen} onClose={() => setRevealOpen(false)} />
    </main>);

}