import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FlippingBookProps {
  /** 0–1: how far the page has turned while pulling */
  progress: number;
  /** Loop the page flip continuously */
  flipping: boolean;
}

const LEFT_PAGE = 'M20 6 C15 3 8 3 3 5 V25 C8 23 15 23 20 26 Z';
const RIGHT_PAGE = 'M20 6 C25 3 32 3 37 5 V25 C32 23 25 23 20 26 Z';

export function FlippingBook({ progress, flipping }: FlippingBookProps) {
  const reduceMotion = useReducedMotion();
  const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' as const };

  return (
    <svg viewBox="0 0 40 30" className="h-8 w-11 text-ink" aria-hidden="true">
      <path d={LEFT_PAGE} fill="rgb(var(--color-surface))" {...stroke} />
      <path d={RIGHT_PAGE} fill="rgb(var(--color-surface))" {...stroke} />
      <motion.path
        d={RIGHT_PAGE}
        fill="#f6b93d"
        {...stroke}
        style={{ transformBox: 'view-box', transformOrigin: '20px 15px' }}
        initial={false}
        animate={
        flipping && !reduceMotion ?
        { scaleX: [1, -1] } :
        { scaleX: 1 - progress * 2 }
        }
        transition={
        flipping && !reduceMotion ?
        { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } :
        { duration: 0 }
        } />
      
    </svg>);

}