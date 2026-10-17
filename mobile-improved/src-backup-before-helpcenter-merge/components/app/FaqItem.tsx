import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FaqItemProps {
  question: string;
  answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left focus-visible:bg-ink/[0.03] focus-visible:outline-none">
        
        <span className="text-[15px] font-semibold leading-snug text-ink">{question}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 text-ink/45 transition-transform duration-200 ease-out', open && 'rotate-180')} />
        
      </button>
      <AnimatePresence initial={false}>
        {open ?
        <motion.div
          id={panelId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden">
          
            <p className="px-4 pb-4 text-sm leading-6 text-ink/65">{answer}</p>
          </motion.div> :
        null}
      </AnimatePresence>
    </li>);

}