import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2Icon, QrCodeIcon, Undo2Icon } from 'lucide-react';
import { PageHeader } from '../components/app/PageHeader';
import { PullToRefresh } from '../components/app/PullToRefresh';
import { ReturnShelf } from '../components/app/ReturnShelf';
import { StatusBadge } from '../components/app/StatusBadge';
import { borrowings } from '../data/borrowings';
import { formatDate, formatPeso, formatShortDate } from '../utils/format';
import { wait } from '../utils/async';
import { sounds } from '../utils/sound';
import type { Borrowing } from '../types/library';

const TODAY = '2026-09-30';
const CONFIRM_MS = 700;

export function Borrowings() {
  const [items, setItems] = useState<Borrowing[]>(borrowings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [shelved, setShelved] = useState<Array<{id: string;title: string;}>>([]);
  const confirmTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  const toReturn = items.filter((item) => item.status !== 'Returned');

  function handleReturn(item: Borrowing) {
    if (pendingId) return;
    setPendingId(item.id);
    confirmTimer.current = window.setTimeout(() => {
      setItems((prev) => prev.map((b) => b.id === item.id ? { ...b, status: 'Returned', returned: TODAY } : b));
      setShelved((prev) => [...prev, { id: item.id, title: item.bookTitle }]);
      setPendingId(null);
      sounds.thunk();
      navigator.vibrate?.(18);
    }, CONFIRM_MS);
  }

  return (
    <PullToRefresh onRefresh={() => wait(900)}>
      <PageHeader title="My Borrowings" subtitle={`${items.length} borrowings total`} />

      <div className="px-5">
        <section aria-labelledby="return-heading" className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-center gap-2">
            <Undo2Icon className="h-5 w-5 text-ink" aria-hidden="true" />
            <h2 id="return-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
              Return books
            </h2>
          </div>
          <p className="mt-1.5 text-[13px] leading-5 text-ink/55">
            Scan the QR label on the book, then hand it to the librarian. The return is complete once they confirm it.
          </p>

          <ReturnShelf books={shelved} />

          {toReturn.length ?
          <ul className="mt-2">
              <AnimatePresence initial={false}>
                {toReturn.map((item) => {
                const pending = pendingId === item.id;
                return (
                  <motion.li
                    key={item.id}
                    exit={{ opacity: 0, height: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden border-b border-ink/[0.07] last:border-b-0">
                    
                      <div className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                          <p className="text-xs text-ink/50">Due {formatShortDate(item.due)}</p>
                        </div>
                        <button
                        type="button"
                        onClick={() => handleReturn(item)}
                        disabled={Boolean(pendingId)}
                        className="flex h-9 w-[7.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink/5 text-sm font-semibold text-ink transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                        
                          {pending ?
                        <>
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Confirming
                            </> :

                        'Return'
                        }
                        </button>
                      </div>
                    </motion.li>);

              })}
              </AnimatePresence>
            </ul> :

          <p className="mt-3 rounded-xl bg-paper px-4 py-4 text-center text-sm text-ink/55">
              {shelved.length ? 'All books returned. Nice.' : 'You have no books to return.'}
            </p>
          }

          <button
            type="button"
            disabled={!toReturn.length}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40">
            
            <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
            Return with QR
          </button>
        </section>

        <section aria-labelledby="history-heading" className="mt-7">
          <h2 id="history-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            History
          </h2>
          <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {items.map((item) =>
            <li key={item.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold leading-snug text-ink">{item.bookTitle}</p>
                  <StatusBadge
                  label={item.status}
                  tone={item.status === 'Returned' ? 'success' : item.status === 'Overdue' ? 'danger' : 'warning'} />
                
                </div>
                <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-ink/45">Borrowed</dt>
                    <dd className="mt-0.5 font-medium text-ink/80">{formatDate(item.borrowed)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink/45">Due</dt>
                    <dd className="mt-0.5 font-medium text-ink/80">{formatDate(item.due)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink/45">Returned</dt>
                    <dd className="mt-0.5 font-medium text-ink/80">{item.returned ? formatDate(item.returned) : '—'}</dd>
                  </div>
                </dl>
                {item.fine ?
              <p className="mt-2.5 text-xs font-semibold text-red-600 dark:text-red-400">Late fine {formatPeso(item.fine)}</p> :
              null}
              </li>
            )}
          </ul>
        </section>
      </div>
    </PullToRefresh>);

}