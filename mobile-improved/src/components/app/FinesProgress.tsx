import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatPeso } from '../../utils/format';

interface FinesProgressProps {
  settled: number;
  total: number;
}

/** Settled vs remaining, as one bar. Sits inside the red "Total unpaid" card. */
export function FinesProgress({ settled, total }: FinesProgressProps) {
  const reduceMotion = useReducedMotion();
  const ratio = total > 0 ? Math.min(1, settled / total) : 1;
  const remaining = Math.max(0, total - settled);

  return (
    <div className="relative mt-4">
      <div
        role="progressbar"
        aria-label="Fines settled"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={settled}
        aria-valuetext={`${formatPeso(settled)} of ${formatPeso(total)} settled`}
        className="h-2.5 overflow-hidden rounded-full bg-red-600/15 dark:bg-red-400/20">
        
        <motion.div
          className="h-full origin-left rounded-full bg-emerald-600 dark:bg-emerald-400"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: ratio }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.1 }} />
        
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold tabular-nums">
        <span className="text-emerald-700 dark:text-emerald-400">{formatPeso(settled)} settled</span>
        <span className="text-red-700 dark:text-red-300">{formatPeso(remaining)} left</span>
      </div>
    </div>);

}