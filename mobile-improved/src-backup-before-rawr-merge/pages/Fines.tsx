import React from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/app/PageHeader';
import { StatusBadge } from '../components/app/StatusBadge';
import { getFines } from '../api/laravel';
import { mapFine } from '../api/adapters';
import { useRemotePage } from '../hooks/useRemotePage';
import { useAuth } from '../auth/AuthContext';
import { formatDate, formatPeso } from '../utils/format';

export function Fines() {
  const { user } = useAuth();
  const remote = useRemotePage(getFines, user ? `fines:${user.id}` : null);
  const fines = (remote.data?.props.fines.data || []).map(mapFine);
  const totalUnpaid = Number(remote.data?.props.totalUnpaid || 0);

  return (
    <>
      <PageHeader title="My Fines" subtitle={`${remote.data?.props.fines.total ?? fines.length} fines total`} />

      <div className="px-5">
        {remote.error ? (
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/15">
            {remote.error}
            <button type="button" className="ml-2 font-bold underline" onClick={remote.refresh}>Retry</button>
          </div>
        ) : null}

        <section
          aria-label="Total unpaid"
          className={`rounded-3xl p-5 ${totalUnpaid > 0 ? 'bg-red-50 ring-1 ring-red-600/15 dark:bg-red-500/10 dark:ring-red-400/20' : 'bg-white ring-1 ring-ink/[0.06]'}`}
        >
          <p className={`text-[13px] font-semibold ${totalUnpaid > 0 ? 'text-red-700 dark:text-red-300' : 'text-ink/55'}`}>Total unpaid</p>
          <p className={`mt-1 text-[40px] font-extrabold leading-none tracking-[-0.05em] ${totalUnpaid > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}>
            {formatPeso(totalUnpaid)}
          </p>
          <p className={`mt-3 text-[13px] leading-5 ${totalUnpaid > 0 ? 'text-red-700/80 dark:text-red-300/80' : 'text-ink/55'}`}>
            {totalUnpaid > 0 ? 'Settle unpaid fines at the library desk to keep borrowing.' : 'You’re all settled. No fines to pay.'}
          </p>
        </section>

        <section aria-labelledby="fines-heading" className="mt-7">
          <h2 id="fines-heading" className="text-base font-bold tracking-[-0.02em] text-ink">Fine history</h2>
          {remote.loading ? <p className="mt-3 text-sm text-ink/55">Loading fines…</p> : null}
          {!remote.loading && fines.length ? (
            <ul className="mt-3 divide-y divide-ink/[0.07] rounded-2xl bg-white ring-1 ring-ink/[0.06]">
              {fines.map((fine) => (
                <li key={fine.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold leading-snug text-ink">{fine.bookTitle}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{fine.type}{fine.date ? ` · ${formatDate(fine.date)}` : ''}</p>
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
          {!remote.loading && !fines.length ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-ink/[0.06]">
              <CircleCheckIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <p className="text-sm text-ink/60">No fines on your account.</p>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
