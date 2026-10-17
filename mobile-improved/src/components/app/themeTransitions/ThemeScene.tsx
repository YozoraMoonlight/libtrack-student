import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MoonIcon, SunIcon } from 'lucide-react';
import { EASE_OUT, PALETTE, buildStars, type ThemeTransitionRequest, type TransitionPhase } from './shared';

interface ThemeSceneProps {
  request: ThemeTransitionRequest;
  phase: TransitionPhase;
  /** Seconds before the scene starts appearing during cover */
  delay?: number;
  /** Where the sun/moon travels in from, in px offsets */
  bodyFrom?: {x: number;y: number;};
  showDecor?: boolean;
}

export function ThemeScene({ request, phase, delay = 0.3, bodyFrom = { x: 0, y: 60 }, showDecor = true }: ThemeSceneProps) {
  const colors = PALETTE[request.to];
  const dark = request.to === 'dark';
  const revealing = phase === 'reveal';
  const stars = useMemo(() => buildStars(request.id), [request.id]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ color: colors.ink }}>
      {showDecor && (
      dark ?
      stars.map((star, index) =>
      <motion.span
        key={index}
        className="absolute rounded-full"
        style={{
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          backgroundColor: colors.ink
        }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={revealing ? { opacity: 0, scale: 1 } : { opacity: star.opacity, scale: 1 }}
        transition={{ delay: revealing ? 0 : delay + 0.05 + star.delay, duration: revealing ? 0.15 : 0.3, ease: EASE_OUT }} />

      ) :
      Array.from({ length: 12 }).map((_, index) =>
      <div key={index} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${index * 30}deg)` }}>
                <motion.span
          className="absolute left-[-1px] top-[70px] block h-[45vmax] w-[2px] origin-top"
          style={{ backgroundColor: colors.accent }}
          initial={{ scaleY: 0, opacity: 0.18 }}
          animate={revealing ? { scaleY: 1, opacity: 0 } : { scaleY: 1, opacity: 0.18 }}
          transition={{ delay: revealing ? 0 : delay + 0.05 + index * 0.02, duration: revealing ? 0.15 : 0.3, ease: EASE_OUT }} />
        
              </div>
      ))}

      <motion.div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.halo }}
        initial={{ x: bodyFrom.x, y: bodyFrom.y, opacity: 0, scale: 0.9, rotate: dark ? -30 : -45 }}
        animate={revealing ? { x: 0, y: -20, opacity: 0, scale: 1.1, rotate: 0 } : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: revealing ? 0 : delay, duration: revealing ? 0.2 : 0.4, ease: EASE_OUT }}>
        
        {dark ?
        <MoonIcon className="h-14 w-14" style={{ color: colors.accent, fill: colors.accent }} strokeWidth={1.5} /> :

        <SunIcon className="h-14 w-14" style={{ color: colors.accent }} strokeWidth={1.75} />
        }
      </motion.div>

      <motion.p
        className="relative mt-6 text-2xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={revealing ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
        transition={{ delay: revealing ? 0 : delay + 0.12, duration: revealing ? 0.15 : 0.25, ease: EASE_OUT }}>
        
        {dark ? 'Dark mode' : 'Light mode'}
      </motion.p>
    </div>);

}