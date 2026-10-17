import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface ExplosionOverlayProps {
  open: boolean;
  onDone: () => void;
}

const DURATION_MS = 1200;
const RINGS = ['#ff4d1a', '#ffb020', '#fff3d6'];
const ease = [0.23, 1, 0.32, 1] as const;

/** Full-screen "EXPLOSION!" blast. Purely cosmetic — nothing is actually cleared. */
export function ExplosionOverlay({ open, onDone }: ExplosionOverlayProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open ?
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#1a0604]"
        initial={{ opacity: 0 }}
        animate={
        reduceMotion ?
        { opacity: 1 } :
        { opacity: 1, x: [0, 0, -14, 12, -8, 6, -3, 0], y: [0, 0, 8, -6, 4, -2, 1, 0] }
        }
        transition={{
          opacity: { duration: 0.25, ease: 'easeOut' },
          x: { duration: 0.8, times: [0, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], ease: 'easeOut' },
          y: { duration: 0.8, times: [0, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], ease: 'easeOut' }
        }}
        exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}>
        
          {!reduceMotion &&
        RINGS.map((color, i) =>
        <motion.span
          key={color}
          aria-hidden="true"
          className="absolute h-40 w-40 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 9, opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.3 + i * 0.07, ease }} />

        )}

          <motion.span
          aria-hidden="true"
          className="absolute inset-0 bg-[#fff6e0]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.35, delay: 0.3, times: [0, 0.15, 1], ease: 'easeOut' }} />
        

        </motion.div> :
      null}
    </AnimatePresence>);

}