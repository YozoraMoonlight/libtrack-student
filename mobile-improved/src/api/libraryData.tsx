import React, { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { getBorrowings, getFines } from './laravel';
import { recordBackgroundBaseline } from './backgroundPoll';
import { useRemotePage, type RemoteState } from '../hooks/useRemotePage';
import { useAuth } from '../auth/AuthContext';
import type { BorrowingsProps, FinesProps } from './laravel';

/**
 * One shared copy of the live circulation data.
 *
 * Previously the notification bell and the Borrowings/Fines screens each ran
 * their own `useRemotePage`. Polling one did nothing for the others, so a
 * librarian approving a return left the "Waiting for approval" card sitting on
 * screen until the student manually refreshed. It also meant N screens open = N
 * identical requests every tick.
 *
 * Hoisting the fetch here means a single poller, and every consumer updates the
 * instant the data lands.
 */

/** Borrows and returns change during a library visit, so poll these fast. */
const POLL_FAST_MS = 3_000;
const POLL_SLOW_MS = 90_000;

/**
 * Fines.
 *
 * This is now the same cadence as borrowings, unconditionally.
 *
 * It used to be a flat 60s, on the reasoning that "fines rarely change while a
 * student is on a screen" - which was backwards. A fine being settled is exactly
 * what a student is waiting on, and at 60s it arrived up to twenty times later
 * than a borrow on the very same screen.
 *
 * An intermediate version made it fast only while `totalUnpaid > 0`, which was
 * wrong for the same reason: settling a fine is what drives `totalUnpaid` back to
 * zero, so the event we were trying to catch is the one thing that switches the
 * poll off. A student with nothing outstanding - which is most of them, most of
 * the time - still got the slow path and still waited.
 *
 * There is no condition here that cannot be broken by the event itself, so
 * fines now simply keep pace with borrowings.
 */
const POLL_FINES_MS = 3_000;

/**
 * Backgrounded cadence.
 *
 * There is no server push, so a backgrounded app polling is the only thing that
 * can raise an Android notification. 15s is the compromise between noticing a
 * change promptly and not waking the radio constantly; the foreground loop
 * stays at the adaptive 3s.
 */
const POLL_BACKGROUND_MS = 15_000;
const IDLE_TICKS_BEFORE_SLOW = 4;

type LibraryDataValue = {
  borrowings: RemoteState<{ props: BorrowingsProps }>;
  fines: RemoteState<{ props: FinesProps }>;
  refreshBorrowings: () => void;
  refreshFines: () => void;
};

const LibraryDataContext = createContext<LibraryDataValue | null>(null);

export function LibraryDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const accountId = user?.id ?? null;

  const borrowings = useRemotePage(
    getBorrowings,
    accountId === null ? null : `borrowings:${accountId}`,
  );
  const fines = useRemotePage(getFines, accountId === null ? null : `fines:${accountId}`);

  const [pollMs, setPollMs] = React.useState(POLL_FAST_MS);
  const [idleTicks, setIdleTicks] = React.useState(0);

  // Stable callbacks so the intervals are created once, not on every render.
  const borrowingsRef = useRef(borrowings);
  const finesRef = useRef(fines);
  borrowingsRef.current = borrowings;
  finesRef.current = fines;

  const refreshBorrowings = useRef<() => void>(() => undefined);
  refreshBorrowings.current = borrowings.refresh;
  const refreshFines = useRef<() => void>(() => undefined);
  refreshFines.current = fines.refresh;

  // Back off while nothing is happening, snap back the moment something does.
  const signature = [
    borrowings.data ? '1' : '0',
    fines.data ? '1' : '0',
    // `data?.props.borrowings.total` is not enough: the optional chain stops at
    // `data`, so a payload whose props lack `borrowings` threw on `.total` and
    // took the whole screen down with it.
    borrowings.data?.props?.borrowings?.total ?? 0,
    (borrowings.data?.props?.activeLoans ?? []).length,
  ].join('|');
  const previousSignature = useRef<string | null>(null);

  useEffect(() => {
    if (accountId === null) return;

    if (previousSignature.current === null) {
      previousSignature.current = signature;
      return;
    }

    if (previousSignature.current !== signature) {
      previousSignature.current = signature;
      setIdleTicks(0);
      setPollMs(POLL_FAST_MS);
      return;
    }

    setIdleTicks((ticks) => {
      const next = ticks + 1;
      setPollMs(next >= IDLE_TICKS_BEFORE_SLOW ? POLL_SLOW_MS : POLL_FAST_MS);
      return next;
    });
  }, [signature, accountId]);

  /**
   * Tell the native background check what the student has just been shown.
   *
   * The background check compares against this to decide whether a librarian
   * did something while the app was closed. Recording it here means the check
   * starts from "the student has seen this much", so it only ever reports what
   * happened *after* they last looked - which is the entire point.
   *
   * Waits for both payloads. Recording a half-loaded pair would write a zero for
   * whichever had not arrived yet, and the next background run would read that
   * zero as a real change.
   *
   * Costs no extra request: these are four integers already parsed out of the
   * pages that were just fetched.
   */
  useEffect(() => {
    if (accountId === null) return;
    if (!borrowings.data || !fines.data) return;

    void recordBackgroundBaseline(String(accountId), {
      activeLoans: (borrowings.data?.props?.activeLoans ?? []).length,
      totalBorrowings: borrowings.data?.props?.borrowings?.total ?? 0,
      totalFines: fines.data?.props?.fines?.total ?? 0,
      totalUnpaid: fines.data?.props?.totalUnpaid ?? 0,
    });
  }, [accountId, borrowings.data, fines.data]);

  // The live loop.
  //
  // Keeps running while backgrounded, because that is the only way an Android
  // notification can be raised at all - the LIBTRACK server has no push, so a
  // backgrounded app is the sole thing polling for changes. The cadence drops
  // hard when hidden to keep the battery cost sane. Still paused entirely while
  // offline, where it cannot help.
  useEffect(() => {
    if (accountId === null) return;

    const hidden = () => document.visibilityState !== 'visible';

    // Backgrounded: one interval, and it must run *while* hidden. This used to
    // bail out on `hidden()` being true, which is exactly the state it exists
    // for - so the background poll never fired and a new event was only ever
    // noticed when the app was opened again and the foreground poll ran.
    const background = window.setInterval(() => {
      if (!hidden()) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      refreshBorrowings.current();
    }, POLL_BACKGROUND_MS);

    const guard = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return true;
    };

    const fast = window.setInterval(() => {
      if (hidden()) return;
      if (guard()) refreshBorrowings.current();
    }, pollMs);

    // Same cadence as borrowings. A plain interval, because there is nothing
    // here to decide adaptively any more - see the note on POLL_FINES_MS for why
    // a condition on the fines payload was the wrong shape.
    const fines = window.setInterval(() => {
      if (hidden()) return;
      if (guard()) refreshFines.current();
    }, POLL_FINES_MS);

    return () => {
      window.clearInterval(background);
      window.clearInterval(fast);
      window.clearInterval(fines);
    };
  }, [accountId, pollMs]);

  // Returning to the app is a strong hint something may have changed.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setIdleTicks(0);
      setPollMs(POLL_FAST_MS);
      refreshBorrowings.current();
      refreshFines.current();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, []);

  const value = useMemo<LibraryDataValue>(
    () => ({
      borrowings,
      fines,
      refreshBorrowings: () => refreshBorrowings.current(),
      refreshFines: () => refreshFines.current(),
    }),
    [borrowings, fines],
  );

  return <LibraryDataContext.Provider value={value}>{children}</LibraryDataContext.Provider>;
}

export function useLibraryData(): LibraryDataValue {
  const context = useContext(LibraryDataContext);
  if (!context) throw new Error('useLibraryData must be used inside LibraryDataProvider');
  return context;
}
