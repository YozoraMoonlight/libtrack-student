import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarCheckIcon, ExpandIcon } from 'lucide-react';
import { BottomSheet } from '../components/app/BottomSheet';
import { QrCode } from '../components/app/QrCode';
import { StatusBadge } from '../components/app/StatusBadge';
import { borrowings } from '../data/borrowings';
import { currentStudent } from '../data/currentStudent';
import { fines } from '../data/fines';
import { formatPeso, formatShortDate } from '../utils/format';

export function Dashboard() {
  const [qrOpen, setQrOpen] = useState(false);

  const active = borrowings.filter((item) => item.status !== 'Returned');
  const unpaid = fines.filter((fine) => fine.status === 'Unpaid').reduce((sum, fine) => sum + fine.amount - fine.paid, 0);
  const recent = borrowings.slice(0, 5);
  const firstName = currentStudent.name.split(' ')[0];

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
          <QrCode value={currentStudent.lrn} className="h-[92px] w-[92px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand-amber">My Library QR</p>
          <p className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-[#fff]">{currentStudent.name}</p>
          <p className="mt-0.5 text-[13px] tabular-nums text-[#fff]/60">LRN {currentStudent.lrn}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#fff]/80">
            <ExpandIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Tap to show at the desk
          </p>
        </div>
      </button>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-ink/[0.07] rounded-2xl bg-white py-4 ring-1 ring-ink/[0.06]">
        <div className="px-4">
          <dt className="text-xs text-ink/55">Active</dt>
          <dd className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">{active.length}</dd>
        </div>
        <div className="px-4">
          <dt className="text-xs text-ink/55">Borrowed</dt>
          <dd className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">{borrowings.length}</dd>
        </div>
        <Link to="/app/fines" className="block px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
          <dt className="text-xs text-ink/55">Unpaid</dt>
          <dd className={`mt-1 text-2xl font-extrabold tracking-[-0.04em] ${unpaid > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}>
            {formatPeso(unpaid).replace('.00', '')}
          </dd>
        </Link>
      </dl>

      <section className="mt-7" aria-labelledby="due-heading">
        <h2 id="due-heading" className="text-base font-bold tracking-[-0.02em] text-ink">
          Upcoming due dates
        </h2>
        {active.length ?
        <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
            {active.map((item) =>
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                <span className="shrink-0 text-sm text-ink/60">Due {formatShortDate(item.due)}</span>
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
            className="-mr-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
            See all
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
          {recent.map((item) =>
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.bookTitle}</p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {formatShortDate(item.borrowed)} – due {formatShortDate(item.due)}
                </p>
              </div>
              <StatusBadge label={item.status} tone={item.status === 'Returned' ? 'success' : item.status === 'Overdue' ? 'danger' : 'warning'} />
            </li>
          )}
        </ul>
      </section>

      <BottomSheet open={qrOpen} title="My Library QR" onClose={() => setQrOpen(false)}>
        <div className="pt-4 text-center">
          <div className="mx-auto w-fit rounded-2xl bg-[#fff] p-4 ring-1 ring-ink/10">
            <QrCode value={currentStudent.lrn} className="h-56 w-56" label={`Library QR code for ${currentStudent.name}`} />
          </div>
          <p className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-ink">{currentStudent.name}</p>
          <p className="mt-1 text-sm tabular-nums text-ink/55">
            LRN {currentStudent.lrn} · {currentStudent.gradeSection}
          </p>
          <p className="mx-auto mt-4 max-w-[280px] text-[13px] leading-5 text-ink/55">
            Present this code to the librarian when borrowing or returning books.
          </p>
        </div>
      </BottomSheet>
    </div>);

}