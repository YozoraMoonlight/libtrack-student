import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from 'lucide-react';
import { BottomSheet } from '../components/app/BottomSheet';
import { BookCover } from '../components/app/BookCover';
import { LibraryQr } from '../components/app/LibraryQr';
import { PageHeader } from '../components/app/PageHeader';
import { PullToRefresh } from '../components/app/PullToRefresh';
import { StatusBadge } from '../components/app/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import { useBorrowCart, type BorrowRequestSummary } from '../api/borrowCart';
import { cn } from '../utils/cn';

const STATUS: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  cart: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'Waiting at the desk', tone: 'warning' },
  released: { label: 'Released', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const ITEM_STATUS: Record<string, string> = {
  requested: 'Waiting',
  released: 'Ready to collect',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

function itemStatusLabel(value: string): string {
  return ITEM_STATUS[value] ?? value;
}

function statusOf(value: string) {
  return STATUS[value] ?? { label: value, tone: 'neutral' as const };
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return format(parseISO(value), 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

function itemSummary(request: BorrowRequestSummary): string {
  const titles = request.items.map((item) => item.title).filter(Boolean);
  if (titles.length <= 2) return titles.join(', ');
  return `${titles.slice(0, 2).join(', ')} +${titles.length - 2} more`;
}

export function BorrowCart() {
  const { user } = useAuth();
  const {
    data,
    cart,
    pending,
    history,
    slate,
    blockedReason,
    loading,
    busy,
    error,
    notice,
    clearNotice,
    remove,
    submit,
    cancel,
    refresh,
  } = useBorrowCart();

  const [qrOpen, setQrOpen] = useState(false);

  const max = Math.max(Number(slate.max || 0), 0);
  const used = Number(slate.loans || 0) + Number(slate.reserved || 0) + Number(slate.cart || 0);
  const remaining = Math.max(max - used, 0);
  const overLimit = max > 0 && used > max;
  const blocked = Boolean(blockedReason);
  const canSubmit = cart.length > 0 && !blocked && !overLimit && !busy;

  async function handleSubmit() {
    const count = cart.length;
    const message = pending
      ? `Add ${count} ${count === 1 ? 'book' : 'books'} to your request waiting at the desk?`
      : `Send ${count} ${count === 1 ? 'book' : 'books'} to the librarian? One copy of each will be set aside for you.`;
    if (typeof window !== 'undefined' && !window.confirm(message)) return;
    await submit();
  }

  async function handleCancel(request: BorrowRequestSummary) {
    if (typeof window !== 'undefined' && !window.confirm('Cancel this request? The books go back on the shelf.')) return;
    await cancel(request.id);
  }

  return (
    <PullToRefresh
      onRefresh={async () => {
        await refresh();
      }}>
      <PageHeader
        title="Borrow Cart"
        subtitle="Pick your books, send one request, then collect them at the desk."
      />

      <div className="space-y-4 px-5">
        {notice ? (
          <div
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-2xl px-3.5 py-3 text-sm ring-1',
              notice.type === 'error'
                ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300'
                : notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-cream text-brand-ember ring-brand-amberDark/30',
            )}>
            {notice.type === 'error' ? (
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p className="flex-1 leading-5">{notice.text}</p>
            <button
              type="button"
              onClick={clearNotice}
              className="-mr-1 shrink-0 rounded-md px-1.5 text-xs font-bold opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              Dismiss
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 leading-5">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="shrink-0 rounded-md px-1.5 text-xs font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              Retry
            </button>
          </div>
        ) : null}

        {blockedReason ? (
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900 ring-1 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Borrowing is paused</p>
              <p className="mt-0.5 leading-5">{blockedReason}</p>
            </div>
          </div>
        ) : null}

        {/* Per-school borrowing limit. The numbers come from the school's
            settings, not from a hard-coded 3 in the app. */}
        <section
          aria-labelledby="limit-heading"
          className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="limit-heading" className="text-sm font-bold text-ink">
                Your borrowing limit
              </h2>
              <p className="mt-0.5 text-[13px] text-ink/55">
                {max > 0
                  ? `${used} of ${max} ${max === 1 ? 'book' : 'books'} in use`
                  : 'Your school has not set a limit yet.'}
              </p>
            </div>
            <span
              className={cn(
                'rounded-lg px-2 py-1 text-xs font-bold',
                overLimit
                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                  : 'bg-cream text-brand-ember',
              )}>
              {max > 0 ? `${remaining} left` : 'No limit'}
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]" role="presentation">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', overLimit ? 'bg-red-500' : 'bg-brand-amber')}
              style={{ width: max > 0 ? `${Math.min((used / max) * 100, 100)}%` : '0%' }}
            />
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['On loan', slate.loans],
              ['At the desk', slate.reserved],
              ['In cart', slate.cart],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-paper/70 px-2 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{label}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {overLimit ? (
            <p className="mt-3 text-xs leading-5 text-red-700 dark:text-red-300">
              Remove {used - max} {used - max === 1 ? 'book' : 'books'} before sending the request.
            </p>
          ) : null}
        </section>

        {pending ? (
          <section aria-labelledby="pending-heading" className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <h2 id="pending-heading" className="text-sm font-bold text-ink">
                Waiting at the desk
              </h2>
              <StatusBadge label={statusOf(pending.status).label} tone={statusOf(pending.status).tone} />
            </div>
            <p className="mt-1 text-[13px] leading-5 text-ink/55">
              {pending.items.length} {pending.items.length === 1 ? 'book is' : 'books are'} set aside for you
              {pending.expires_at ? ` until ${formatWhen(pending.expires_at)}.` : '.'}
            </p>
            <ul className="mt-3 space-y-2">
              {pending.items.map((item) => (
                <li key={item.id} className="rounded-xl bg-paper/70 px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {[item.copy, item.location, itemStatusLabel(item.status)].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white active:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                Show my library QR
              </button>
              {pending.status === 'pending' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCancel(pending)}
                  className="h-10 rounded-xl px-3 text-sm font-semibold text-red-600 ring-1 ring-red-600/20 active:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-50 dark:text-red-400">
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="cart-heading">
          <div className="flex items-center justify-between">
            <h2 id="cart-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
              In your cart
            </h2>
            <Link
              to="/app/browse"
              className="-mr-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              Add books
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {loading && !cart.length ? (
            <div className="mt-3 space-y-2">
              {[0, 1].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-ink/[0.06]" />
              ))}
            </div>
          ) : cart.length ? (
            <ul className="mt-3 space-y-3">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-ink/[0.06]">
                  <BookCover src={item.cover_image_url} title={item.title || 'Book'} className="h-[76px] w-[56px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-bold leading-snug text-ink">{item.title || 'Untitled book'}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink/55">{item.author || 'Unknown author'}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      {item.available_copies > 0
                        ? `${item.available_copies} ${item.available_copies === 1 ? 'copy' : 'copies'} on the shelf`
                        : 'No copy on the shelf right now'}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.scanned_copy ? (
                        <span className="rounded-md bg-cream px-1.5 py-0.5 text-[11px] font-semibold text-brand-ember">
                          Scanned {item.scanned_copy}
                        </span>
                      ) : null}
                      {item.has_pdf ? (
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          Physical copy
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(item.id)}
                    aria-label={`Remove ${item.title || 'book'} from your cart`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink/40 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-40 dark:hover:bg-red-500/10">
                    <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex flex-col items-center rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-ink/[0.06]">
              <ShoppingCartIcon className="h-7 w-7 text-ink/25" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold text-ink">Your cart is empty</p>
              <p className="mt-1 max-w-[250px] text-[13px] leading-5 text-ink/55">
                Add a book from Browse, or scan the sticker on the shelf, and it will show up here.
              </p>
              <Link
                to="/app/browse"
                className="mt-4 flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white active:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                Browse books
              </Link>
            </div>
          )}
        </section>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/40',
            canSubmit ? 'bg-brand-amber text-[#121212] active:bg-brand-amberDark' : 'bg-ink/10 text-ink/35',
          )}>
          {busy ? (
            'Working…'
          ) : (
            <>
              <ShoppingCartIcon className="h-5 w-5" aria-hidden="true" />
              {pending ? 'Add to my request' : 'Send request to the librarian'}
            </>
          )}
        </button>
        <p className="px-2 text-center text-xs leading-5 text-ink/50">
          {pending
            ? 'New titles are added to the request already waiting at the desk.'
            : 'One copy of every title is set aside for you when you send the request. Nothing is borrowed until you collect it.'}
        </p>

        {history.length ? (
          <section aria-labelledby="history-heading" className="pt-2">
            <div className="flex items-center justify-between">
              <h2 id="history-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
                Past requests
              </h2>
              <button
                type="button"
                onClick={() => void refresh()}
                aria-label="Refresh past requests"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/45 hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                <RefreshCwIcon className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-2 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
              {history.map((request) => (
                <li key={request.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{itemSummary(request)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/45">
                        <ClockIcon className="h-3 w-3" aria-hidden="true" />
                        {formatWhen(request.closed_at || request.submitted_at) || 'Date unavailable'}
                        {request.handled_by ? ` · by ${request.handled_by}` : ''}
                      </p>
                      {request.note ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{request.note}</p>
                      ) : null}
                    </div>
                    <StatusBadge label={statusOf(request.status).label} tone={statusOf(request.status).tone} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="pb-2 text-center text-xs leading-5 text-ink/40">
          Your due date is set by the librarian when the books are released, and it skips days the library is closed.
        </p>
      </div>

      <BottomSheet open={qrOpen} title="My Library QR" onClose={() => setQrOpen(false)}>
        <div className="pt-4 text-center">
          <div className="mx-auto w-fit rounded-2xl bg-[#fff] p-4 ring-1 ring-ink/10">
            <LibraryQr
              value={String(user?.lrn || user?.student_id || '')}
              imageSource={data?.props?.qrCode ?? undefined}
              className="h-56 w-56"
              label={`Library QR code for ${user?.name || 'student'}`}
            />
          </div>
          <p className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-ink">{user?.name}</p>
          <p className="mt-1 text-sm tabular-nums text-ink/55">LRN {String(user?.lrn || user?.student_id || '—')}</p>
          <p className="mx-auto mt-4 max-w-[280px] text-[13px] leading-5 text-ink/55">
            Show this code at the desk to collect the books set aside for you.
          </p>
        </div>
      </BottomSheet>
    </PullToRefresh>
  );
}
