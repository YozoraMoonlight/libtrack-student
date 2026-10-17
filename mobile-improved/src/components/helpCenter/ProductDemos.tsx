import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { productDemos } from '../../data/helpCenter';
import { cn } from '../../utils/cn';

export function ProductDemos() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <p className="text-sm text-ink/55">Step-by-step walkthroughs of the things students do most.</p>
      <ul className="mt-3 space-y-2">
        {productDemos.map((demo) => {
          if (demo.to) {
            return (
              <li key={demo.id} className="rounded-2xl ring-1 ring-ink/[0.07]">
                <Link
                  to={demo.to}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors duration-150 active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                  
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f5fd0] text-[#fff]">
                    <PlayIcon className="ml-0.5 h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{demo.title}</span>
                    <span className="block text-[13px] leading-5 text-ink/55">{demo.summary}</span>
                    <span className="mt-1 block text-[12px] font-semibold text-brand-ember">Interactive walkthrough · {demo.steps.length} steps</span>
                  </span>
                  <ChevronRightIcon className="mt-3 h-4 w-4 shrink-0 text-ink/30" aria-hidden="true" />
                </Link>
              </li>);

          }
          const open = active === demo.id;
          return (
            <li key={demo.id} className={cn('rounded-2xl ring-1 transition-colors duration-150', open ? 'ring-[#2f5fd0]/40' : 'ring-ink/[0.07]')}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setActive(open ? null : demo.id)}
                className="flex w-full items-start gap-3 rounded-2xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f5fd0] text-[#fff]">
                  {open ? <PauseIcon className="h-4 w-4" aria-hidden="true" /> : <PlayIcon className="ml-0.5 h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{demo.title}</span>
                  <span className="block text-[13px] leading-5 text-ink/55">{demo.summary}</span>
                  <span className="mt-1 block text-[12px] font-semibold text-brand-ember">{demo.steps.length} steps</span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open ?
                <motion.ol
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden px-3">
                  
                    {demo.steps.map((step, i) =>
                  <li key={step} className="flex gap-3 pb-3 text-sm leading-6 text-ink/70">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[11px] font-bold tabular-nums text-ink/60">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                  )}
                  </motion.ol> :
                null}
              </AnimatePresence>
            </li>);

        })}
      </ul>
    </div>);

}