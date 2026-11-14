import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarCheckIcon, ExpandIcon, ShoppingCartIcon } from 'lucide-react';
import { BottomSheet } from '../components/app/BottomSheet';
import { LibraryQr } from '../components/app/LibraryQr';
import { StatusBadge } from '../components/app/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import { useBorrowCart } from '../api/borrowCart';
import type { LiveTransaction } from '../api/laravel';
import type { Borrowing } from '../types/library';
import { formatPeso, formatShortDate } from '../utils/format';

export function Dashboard() {
  const [qrOpen, setQrOpen] = useState(false);
  const { user, dashboard, refreshSession } = useAuth();
  const { count: cartCount, pending } = useBorrowCart();

  if (!dashboard || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-5 text-center text-sm text-ink/60">
        <div>
          <p>Loading your library dashboard…</p>
          <button type="button" className="mt-3 font-bold text-brand-ember" onClick={() => void refreshSession()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0];
  const lrn = String(user.lrn || user.student_id || '—');
  const schoolName = user.school_name || dashboard.user.school_name || '';
  const active = dashboard.upcomingDue.map(mapTransaction);
  const recent = dashboard.recentActivity.map(mapTransaction);
  const unpaid = Number(dashboard.stats.unpaidFines || 0);
  const totalBorrowed = Number(dashboard.stats.totalBorrowed || 0);

  return (
    <div className="px-5 pt-2">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.045em] text-ink">Hi, {firstName}</h1>
      <p className="mt-1 text-[15px] text-ink/55">Welcome back to your library.</p>

      <button
        type="button"
        onClick={() => setQrOpen(true)}
        className="mt-5 flex w-full items-center gap-4 rounded-3xl bg-[#121212] p-4 text-left ring-1 ring-transparent transition-colors duration-150 ease-out active:bg-[#1f1f1f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-amber/50 dark:bg-[#141414] dark:ring-white/10 dark:active:bg-[#1f1f1f]"
        aria-label="Open my library QR code">

        <div className="shrink-0 rounded-2xl bg-[#fff] p-2.5">
          <LibraryQr value={lrn} imageSource={dashboard.qrCode} className="h-[92px] w-[92px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand-amber">My Library QR</p>
          <p className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-[#fff]">{user.name}</p>
          <p className="mt-0.5 text-[13px] tabular-nums text-[#fff]/60">LRN {lrn}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#fff]/80">
            <ExpandIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Tap to show at the desk
          </p>
        </div>
      </button>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-ink/[0.07] rounded-2xl bg-white py-4 ring-1 ring-ink/[0.06]">
        <div className="px-4">
          <dt className="text-xs text-ink/55">Active</dt>
          <dd className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">{dashboard.stats.activeBorrows}</dd>
        </div>
        <div className="px-4">
          <dt className="text-xs text-ink/55">Borrowed</dt>
          <dd className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">{totalBorrowed}</dd>
        </div>
        <Link to="/app/fines" className="block px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
          <dt className="text-xs text-ink/55">Unpaid</dt>
          <dd className={`mt-1 text-2xl font-extrabold tracking-[-0.04em] ${unpaid > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}>
            {formatPeso(unpaid).replace('.00', '')}
          </dd>
        </Link>
      </dl>

      {user.academic_strand || schoolName ? (
        <p className="mt-2 px-1 text-[13px] text-ink/50">
          {[user.academic_strand, schoolName].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <Link
        to="/app/cart"
        className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-ink/[0.06] transition-colors duration-150 active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-brand-ember">
          <ShoppingCartIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">Borrow Cart</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink/55">
            {pending
              ? 'A request is waiting at the desk'
              : cartCount > 0
                ? `${cartCount} ${cartCount === 1 ? 'book' : 'books'} ready to request`
                : 'Pick books and send one request'}
          </span>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink/30" aria-hidden="true" />
      </Link>

      <section className="mt-7" aria-labelledby="due-heading">
        <h2 id="due-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
          Upcoming due dates
        </h2>
        {active.length ?
        <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {active.map((item) =>
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                <span className="shrink-0 text-sm text-ink/60">Due {item.due ? formatShortDate(item.due) : '—'}</span>
              </li>
          )}
          </ul> :

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-ink/[0.06]">
            <CalendarCheckIcon className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="text-sm text-ink/60">Nothing due. You have no books out right now.</p>
          </div>
        }
      </section>

      <section className="mt-7" aria-labelledby="activity-heading">
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
            Recent activity
          </h2>
          <Link
            to="/app/borrowings"
            className="-mr-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          >
            See all
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {recent.length ? (
          <ul className="mt-2 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {recent.map((item) =>
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {item.borrowed ? formatShortDate(item.borrowed) : 'Date unavailable'} – due {item.due ? formatShortDate(item.due) : '—'}
                  </p>
                </div>
                <StatusBadge label={item.status} tone={item.status === 'Returned' ? 'success' : item.status === 'Overdue' ? 'danger' : 'warning'} />
              </li>
            )}
          </ul>
        ) : (
          <div className="mt-3 rounded-2xl bg-white px-4 py-4 text-sm text-ink/60 ring-1 ring-ink/[0.06]">
            No borrowing activity yet.
          </div>
        )}
      </section>

      <BottomSheet open={qrOpen} title="My Library QR" onClose={() => setQrOpen(false)}>
        <div className="pt-4 text-center">
          <div className="mx-auto w-fit rounded-2xl bg-[#fff] p-4 ring-1 ring-ink/10">
            <LibraryQr value={lrn} imageSource={dashboard.qrCode} className="h-56 w-56" label={`Library QR code for ${user.name}`} />
          </div>
          <p className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-ink">{user.name}</p>
          <p className="mt-1 text-sm tabular-nums text-ink/55">
            LRN {lrn}{schoolName ? ` · ${schoolName}` : ''}
          </p>
          <p className="mx-auto mt-4 max-w-[280px] text-[13px] leading-5 text-ink/55">
            Present this code to the librarian when borrowing or returning books.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

function mapTransaction(transaction: LiveTransaction): Borrowing {
  const status = String(transaction.status || 'active').toLowerCase();
  const statusLabel: Borrowing['status'] = status === 'returned' ? 'Returned' : status === 'overdue' ? 'Overdue' : 'Borrowed';
  const fines = Array.isArray(transaction.fines) ? transaction.fines : [];

  return {
    id: String(transaction.id),
    bookTitle: String(transaction.book?.title || transaction.book_title || 'Unknown book'),
    borrowed: transaction.borrowed_at || '',
    due: transaction.due_date || '',
    returned: transaction.returned_at || null,
    status: statusLabel,
    fine: fines.length ? fines.reduce((sum, fine) => sum + Number(fine.amount || 0), 0) : null,
  };
}
