import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheckIcon } from 'lucide-react';
import { ExplosionOverlay } from '../components/app/ExplosionOverlay';
import { FinesProgress } from '../components/app/FinesProgress';
import { OwlMascot } from '../components/auth/OwlMascot';
import { PageHeader } from '../components/app/PageHeader';
import { StatusBadge } from '../components/app/StatusBadge';
import { getFines } from '../api/laravel';
import { mapFine } from '../api/adapters';
import { useRemotePage } from '../hooks/useRemotePage';
import { useAuth } from '../auth/AuthContext';
import { useLongPress } from '../hooks/useLongPress';
import { formatDate, formatPeso } from '../utils/format';
import { sounds } from '../utils/sound';
import type { Fine } from '../types/library';

const TAPS_TO_ARM = 5;
const TAP_WINDOW_MS = 1500;
const ARMED_MS = 3000;
const CHANT_MS = 2000;

interface FinesProps {
  /** Preview the "all cleared" state */
  cleared?: boolean;
}

export function Fines({ cleared = false }: FinesProps) {
  const { user } = useAuth();
  const remote = useRemotePage(getFines, user ? `fines:${user.id}` : null);

  const liveFines = useMemo(
    () => (remote.data?.props.fines.data || []).map(mapFine),
    [remote.data],
  );

  const list: Fine[] = cleared
    ? liveFines.map((fine) => ({ ...fine, status: 'Paid', paid: fine.amount }))
    : liveFines;

  const serverUnpaid = Number(remote.data?.props.totalUnpaid ?? 0);
  const totalUnpaid = cleared
    ? 0
    : list.filter((fine) => fine.status === 'Unpaid').reduce((sum, fine) => sum + fine.amount - fine.paid, 0);
  const totalAmount = list.reduce((sum, fine) => sum + fine.amount, 0);
  const hasUnpaid = totalUnpaid > 0 || serverUnpaid > 0;

  const [blasting, setBlasting] = useState(false);
  const [armed, setArmed] = useState(false);
  const taps = useRef<number[]>([]);
  const disarmTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(disarmTimer.current), []);

  function disarm() {
    window.clearTimeout(disarmTimer.current);
    taps.current = [];
    setArmed(false);
  }

  // Step 1: tap the amount 5 times quickly to arm. No visible feedback, just a buzz.
  function handleAmountTap() {
    if (!hasUnpaid || armed) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_TO_ARM) {
      taps.current = [];
      setArmed(true);
      navigator.vibrate?.(6);
      disarmTimer.current = window.setTimeout(disarm, ARMED_MS);
    }
  }

  // Step 2: hold the card to chant. Releasing early disarms it.
  const chant = useLongPress(CHANT_MS, () => {
    disarm();
    setBlasting(true);
    sounds.explosion();
    navigator.vibrate?.([20, 30, 20, 30, 220]);
  });

  const chantHandlers = {
    ...chant.handlers,
    onPointerDown: () => {
      window.clearTimeout(disarmTimer.current);
      chant.handlers.onPointerDown();
    },
    onPointerUp: () => {
      if (chant.holding) disarm();
      chant.handlers.onPointerUp();
    },
    onPointerLeave: () => {
      if (chant.holding) disarm();
      chant.handlers.onPointerLeave();
    },
    onPointerCancel: () => {
      if (chant.holding) disarm();
      chant.handlers.onPointerCancel();
    },
  };

  const handleBlastDone = useCallback(() => setBlasting(false), []);

  return (
    <>
      <PageHeader
        title="My Fines"
        subtitle={remote.loading ? 'Loading your fines…' : `${remote.data?.props.fines.total ?? list.length} fines total`}
      />

      <div className="px-5">
        {remote.error ? (
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/15">
            {remote.error}
            <button type="button" className="ml-2 font-bold underline" onClick={remote.refresh}>Retry</button>
          </div>
        ) : null}

        <section
          aria-label="Total unpaid"
          {...hasUnpaid && armed ? chantHandlers : {}}
          className={`relative select-none overflow-hidden rounded-3xl p-5 [-webkit-touch-callout:none] ${hasUnpaid ? 'bg-red-50 ring-1 ring-red-600/15 dark:bg-red-500/10 dark:ring-red-400/20' : 'bg-white ring-1 ring-ink/[0.06]'}`}>

          {/* Magic circle charges while the chant is held */}
          <AnimatePresence>
            {chant.holding ? (
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-red-600/40 dark:text-red-400/40"
                initial={{ opacity: 0, scale: 0.96, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 120 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.15, ease: 'easeOut' },
                  scale: { duration: 0.2, ease: 'easeOut' },
                  rotate: { duration: CHANT_MS / 1000, ease: 'linear' },
                }}>
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />
                <polygon points="50,8 86,71 14,71" fill="none" stroke="currentColor" strokeWidth="1" />
                <polygon points="50,92 14,29 86,29" fill="none" stroke="currentColor" strokeWidth="1" />
              </motion.svg>
            ) : null}
          </AnimatePresence>

          {hasUnpaid ? (
            <>
              <p className="relative text-[13px] font-semibold text-red-700 dark:text-red-300">Total unpaid</p>
              <p
                onClick={handleAmountTap}
                className="relative mt-1 w-fit text-[40px] font-extrabold leading-none tracking-[-0.05em] text-red-600 dark:text-red-400">
                {formatPeso(totalUnpaid || serverUnpaid)}
              </p>
              <FinesProgress settled={Math.max(totalAmount - totalUnpaid, 0)} total={totalAmount} />
              <p aria-live="polite" className="relative mt-3 text-[13px] leading-5 text-red-700/80 dark:text-red-300/80">
                Settle unpaid fines at the library desk to keep borrowing.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">All cleared</p>
                <p className="mt-1 text-[40px] font-extrabold leading-none tracking-[-0.05em] text-ink">{formatPeso(0)}</p>
                <p aria-live="polite" className="mt-3 text-[13px] leading-5 text-ink/55">
                  {totalAmount > 0
                    ? `All ${formatPeso(totalAmount)} settled. You’re free to borrow.`
                    : 'No fines to pay.'}
                </p>
              </div>
              <OwlMascot mood="smug" className="h-[76px] w-24 shrink-0" />
            </div>
          )}
        </section>

        <section aria-labelledby="fines-heading" className="mt-7">
          <h2 id="fines-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            Fine history
          </h2>

          {remote.loading ? <p className="mt-3 text-sm text-ink/55">Loading fines…</p> : null}

          {!remote.loading && list.length ? (
            <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
              {list.map((fine) => (
                <li key={fine.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold leading-snug text-ink">{fine.bookTitle}</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {fine.type}{fine.date ? ` · ${formatDate(fine.date)}` : ''}
                      </p>
                    </div>
                    <StatusBadge label={fine.status} tone={fine.status === 'Paid' ? 'success' : 'danger'} />
                  </div>
                  <dl className="mt-3 flex gap-6 text-xs">
                    <div>
                      <dt className="text-ink/45">Amount</dt>
                      <dd className="mt-0.5 text-sm font-bold tabular-nums text-ink">{formatPeso(fine.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Paid</dt>
                      <dd className="mt-0.5 text-sm font-bold tabular-nums text-ink">{formatPeso(fine.paid)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : null}

          {!remote.loading && !list.length ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-ink/[0.06]">
              <CircleCheckIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <p className="text-sm text-ink/60">No fines on your account.</p>
            </div>
          ) : null}
        </section>
      </div>

      <ExplosionOverlay open={blasting} onDone={handleBlastDone} />
    </>
  );
}
