import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HourglassIcon, QrCodeIcon, HandIcon } from 'lucide-react';
import { formatShortDate } from '../../utils/format';
import type { Borrowing } from '../../types/library';

interface ReturnRequestsProps {
  requests: Borrowing[];
}

/**
 * Every return the student has asked for and the librarian has not confirmed.
 *
 * Built from the server's active loans, so a book leaves this list by itself the
 * moment staff close the loan. Nothing here is inferred from taps in this
 * session, and no total is claimed beyond the rows actually shown.
 */
export function ReturnRequests({ requests }: ReturnRequestsProps) {
  const reduceMotion = useReducedMotion();
  if (!requests.length) return null;

  return (
    <section aria-labelledby="requests-heading" className="mt-3 rounded-xl bg-cream/70 p-4 ring-1 ring-brand-amberDark/25">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream ring-1 ring-brand-amberDark/30">
          <HourglassIcon className="h-4 w-4 text-brand-ember" strokeWidth={2.1} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 id="requests-heading" className="text-[13px] font-bold tracking-[-0.01em] text-ink">
            Waiting for approval
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-ink/55">
            Hand {requests.length === 1 ? 'this book' : 'these books'} to the desk. The return is only complete once the
            librarian confirms it.
          </p>

          <ul className="mt-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {requests.map((item) => {
                const scanned = item.returnRequestedMethod === 'scan' || item.returnRequestedMethod === 'qr';
                const Icon = scanned ? QrCodeIcon : HandIcon;

                return (
                  <motion.li
                    key={item.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-ink/[0.07]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink" title={item.bookTitle}>
                        {item.bookTitle}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/50">
                        <span>Due {item.due ? formatShortDate(item.due) : '—'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {scanned ? 'Scanned' : 'Requested in app'}
                        </span>
                      </p>
                    </div>

                    <span className="shrink-0 rounded-md bg-brand-amber/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ember ring-1 ring-brand-amberDark/25">
                      Pending
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </section>);

}
