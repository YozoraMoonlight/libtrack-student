import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { BookOpenIcon } from 'lucide-react';
import { Bookshelf } from './Bookshelf';
import { CreatorReveal } from './CreatorReveal';
import { sounds } from '../../utils/sound';
import { ThemeToggle } from '../app/ThemeToggle';

interface HeroAuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ease = [0.23, 1, 0.32, 1] as const;
const REVEAL_TAPS = 10;

export function HeroAuthLayout({ title, subtitle, children }: HeroAuthLayoutProps) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const [revealOpen, setRevealOpen] = useState(false);
  const taps = useRef(0);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  function handleLogoTap() {
    taps.current += 1;
    window.clearTimeout(resetTimer.current);

    if (taps.current >= REVEAL_TAPS) {
      taps.current = 0;
      sounds.reveal();
      navigator.vibrate?.([30, 40, 60]);
      setRevealOpen(true);
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
    }, 1500);
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
              aria-label="LIBTRACK"
              animate={controls}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-amber text-[#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ember">
              
              <BookOpenIcon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={2.25} />
            </motion.button>
            <p className="flex-1 text-[19px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</p>
            <ThemeToggle />
          </div>

          <div className="mb-7 mt-8">
            <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">{title}</h1>
            {subtitle ? <p className="mt-2 text-[15px] leading-6 text-ink/55">{subtitle}</p> : null}
          </div>

          {children}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease, delay: 0.08 }}>
          
          <Bookshelf />
        </motion.div>
      </section>
      <CreatorReveal open={revealOpen} onClose={() => setRevealOpen(false)} />
    </main>);

}