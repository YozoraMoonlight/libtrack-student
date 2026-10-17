import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type DeathNoteTrigger = 'kira' | 'l';

interface DeathNotePageProps {
  trigger: DeathNoteTrigger;
}

const lines: Record<DeathNoteTrigger, string[]> = {
  kira: [
  'Kira detected.',
  'The human whose password is written in this note',
  'shall be locked out in 40 seconds.',
  'Please use a real password.'],

  l: ['L Lawliet?', 'Even the world’s greatest detective', 'needs at least 8 characters.', 'Please use a real password.']
};

const ease = [0.23, 1, 0.32, 1] as const;

/** Appears under the password field when someone types "Kira" or "L". */
export function DeathNotePage({ trigger }: DeathNotePageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2, ease }}
      className="overflow-hidden rounded-xl bg-[#0b0b0b] p-1.5 shadow-card">
      
      <p className="px-2 pb-1 pt-0.5 font-gothic text-lg leading-tight text-[#f3efe6]">Death Note</p>
      <div className="rounded-lg bg-[#f3efe6] px-4 py-2">
        {lines[trigger].map((line, i) =>
        <motion.p
          key={line}
          className={`border-b border-[#1a1a1a]/15 py-0.5 font-hand text-[19px] leading-7 text-[#1a1a1a] last:border-b-0 ${i === lines[trigger].length - 1 ? 'text-[#9f1d20]' : ''}`}
          initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.28, delay: 0.15 + i * 0.28, ease: 'easeOut' }}>
          
            {line}
          </motion.p>
        )}
      </div>
    </motion.div>);

}