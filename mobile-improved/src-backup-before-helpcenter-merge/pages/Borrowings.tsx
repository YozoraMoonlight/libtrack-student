import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CameraIcon, Loader2Icon, QrCodeIcon, Undo2Icon } from 'lucide-react';
import { BottomSheet } from '../components/app/BottomSheet';
import { PullToRefresh } from '../components/app/PullToRefresh';
import { QrScanner } from '../components/app/QrScanner';
import { PageHeader } from '../components/app/PageHeader';
import { ReturnRequests } from '../components/app/ReturnRequests';
import { StatusBadge } from '../components/app/StatusBadge';
import { ApiError, getBorrowings, isConnectionError, requestReturn } from '../api/laravel';
import { mapActiveLoan, mapBorrowing } from '../api/adapters';
import { useRemotePage } from '../hooks/useRemotePage';
import { useAuth } from '../auth/AuthContext';
import { enqueueReturn, pendingReturnCount } from '../offline/outbox';
import { formatDate, formatPeso, formatShortDate } from '../utils/format';
import { sounds } from '../utils/sound';
import type { Borrowing } from '../types/library';

export function Borrowings() {
  const [message, setMessage] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedQr, setScannedQr] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();
  const remote = useRemotePage(getBorrowings, user ? `borrowings:${user.id}` : null);

  const syncPendingCount = useCallback(() => {
    if (user?.id) setPendingCount(pendingReturnCount(user.id));
  }, [user?.id]);

  useEffect(() => {
    syncPendingCount();
    const onSynced = () => {
      syncPendingCount();
      remote.refresh();
    };
    window.addEventListener('libtrack:returns-synced', onSynced);
    return () => window.removeEventListener('libtrack:returns-synced', onSynced);
  }, [remote.refresh, syncPendingCount]);

  const history = (remote.data?.props.borrowings.data || []).map(mapBorrowing);
  const toReturn = (remote.data?.props.activeLoans || []).map(mapActiveLoan);

  // Outstanding requests come straight from the server. A book drops out of this
  // list on its own once staff close the loan, because it leaves `activeLoans`.
  const requests = toReturn.filter((item) => Boolean(item.returnRequestedAt));

  // The row list is only for books you can still act on. Anything already
  // requested lives in the pending panel above, so it is not repeated here.
  const returnable = toReturn.filter((item) => !item.returnRequestedAt);

  async function submitReturn(payload: { transaction_id?: number; scanned_qr?: string }) {
    setMessage(null);
    setReturningId(payload.transaction_id ? String(payload.transaction_id) : 'qr');
    try {
      const result = await requestReturn(payload);
      setMessage(result.message || 'Return requested. Bring the book to the library.');
      if (payload.transaction_id) {
        sounds.thunk();
        navigator.vibrate?.(18);
      }
      setQrSheetOpen(false);
      setScannedQr('');
      remote.refresh();
    } catch (error: unknown) {
      if (isConnectionError(error) && user?.id) {
        enqueueReturn(user.id, payload);
        syncPendingCount();
        setMessage('You are offline. The return request is queued and will sync automatically.');
        remote.refresh();
        return;
      }
      setMessage(error instanceof ApiError ? error.message : 'Unable to request this return.');
    } finally {
      setReturningId(null);
    }
  }

  function returnLoan(item: Borrowing) {
    const id = Number(item.id);
    if (Number.isFinite(id)) void submitReturn({ transaction_id: id });
  }

  function submitQrReturn(event: React.FormEvent) {
    event.preventDefault();
    if (scannedQr.trim()) void submitReturn({ scanned_qr: scannedQr.trim() });
  }

  return (
    <PullToRefresh onRefresh={async () => { remote.refresh(); }}>
      <PageHeader
        title="My Borrowings"
        subtitle={remote.loading ? 'Loading your loans…' : `${remote.data?.props.borrowings.total ?? history.length} borrowings total`}
      />

      <div className="px-5">
        {message ? <p className="mb-3 rounded-xl bg-ink/[0.05] px-3 py-2 text-sm text-ink/70">{message}</p> : null}
        {pendingCount > 0 ? <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{pendingCount} return request{pendingCount === 1 ? '' : 's'} waiting to sync.</p> : null}
        {remote.error ? (
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/15">
            {remote.error}
            <button type="button" className="ml-2 font-bold underline" onClick={remote.refresh}>Retry</button>
          </div>
        ) : null}

        <section aria-labelledby="return-heading" className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-center gap-2">
            <Undo2Icon className="h-5 w-5 text-ink" aria-hidden="true" />
            <h2 id="return-heading" className="text-base font-bold tracking-[-0.02em] text-ink">Return books</h2>
          </div>
          <p className="mt-1.5 text-[13px] leading-5 text-ink/55">
            Request a return below, or scan the QR label on the book. The librarian confirms the return at the desk.
          </p>

          <ReturnRequests requests={requests} />

          {returnable.length ? (
            <ul className="mt-2">
              <AnimatePresence initial={false}>
                {returnable.map((item) => {
                  const pending = returningId === item.id;

                  return (
                    <motion.li
                      key={item.id}
                      exit={{ opacity: 0, height: 0, y: -12 }}
                      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden border-b border-ink/[0.07] last:border-b-0">

                      <div className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                          <p className="text-xs text-ink/50">Due {item.due ? formatShortDate(item.due) : '—'}</p>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(returningId)}
                          onClick={() => returnLoan(item)}
                          className="flex h-9 w-[7.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink/5 text-sm font-semibold text-ink transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                          {pending ? (
                            <>
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Confirming
                            </>
                          ) : (
                            'Return'
                          )}
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-paper px-4 py-4 text-center text-sm text-ink/55">
              {requests.length
                ? 'Nothing left to request. Hand the ones above to the desk to finish.'
                : 'You have no books to return.'}
            </p>
          )}

          <button
            type="button"
            disabled={!returnable.length}
            onClick={() => setQrSheetOpen(true)}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40">
            <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
            Return with QR
          </button>
        </section>

        <section aria-labelledby="history-heading" className="mt-7">
          <h2 id="history-heading" className="text-base font-bold tracking-[-0.02em] text-ink">History</h2>
          {remote.loading ? <p className="mt-3 text-sm text-ink/55">Loading borrowings…</p> : null}
          {!remote.loading && history.length ? (
            <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
              {history.map((item) => (
                <li key={item.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold leading-snug text-ink">{item.bookTitle}</p>
                    <StatusBadge label={item.status} tone={item.status === 'Returned' ? 'success' : item.status === 'Overdue' ? 'danger' : 'warning'} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-ink/45">Borrowed</dt>
                      <dd className="mt-0.5 font-medium text-ink/80">{item.borrowed ? formatDate(item.borrowed) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Due</dt>
                      <dd className="mt-0.5 font-medium text-ink/80">{item.due ? formatDate(item.due) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Returned</dt>
                      <dd className="mt-0.5 font-medium text-ink/80">{item.returned ? formatDate(item.returned) : '—'}</dd>
                    </div>
                  </dl>
                  {item.fine ? <p className="mt-2.5 text-xs font-semibold text-red-600 dark:text-red-400">Late fine {formatPeso(item.fine)}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {!remote.loading && !history.length ? <p className="mt-3 rounded-2xl bg-white px-4 py-4 text-sm text-ink/60 ring-1 ring-ink/[0.06]">No borrowing history yet.</p> : null}
        </section>
      </div>

      <BottomSheet open={qrSheetOpen} title="Return with QR" onClose={() => { setQrSheetOpen(false); setScannerOpen(false); }}>
        {scannerOpen ? (
          <QrScanner
            onScan={(value) => {
              setScannedQr(value);
              setScannerOpen(false);
            }}
            onCancel={() => setScannerOpen(false)}
          />
        ) : (
          <form className="pt-3" onSubmit={submitQrReturn}>
            <button type="button" onClick={() => setScannerOpen(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white">
              <CameraIcon className="h-5 w-5" aria-hidden="true" />
              Scan with camera
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-ink/40"><span className="h-px flex-1 bg-ink/10" />or enter payload<span className="h-px flex-1 bg-ink/10" /></div>
            <label className="text-sm font-semibold text-ink" htmlFor="scanned-qr">QR payload</label>
            <input
              id="scanned-qr"
              value={scannedQr}
              onChange={(event) => setScannedQr(event.target.value)}
              placeholder="LIBTRACK:COPY:..."
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-3 text-sm outline-none focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/25"
            />
            <button type="submit" disabled={!scannedQr.trim() || returningId === 'qr'} className="mt-4 h-12 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:opacity-40">
              {returningId === 'qr' ? 'Sending…' : 'Request return'}
            </button>
          </form>
        )}
      </BottomSheet>
    </PullToRefresh>
  );
}
