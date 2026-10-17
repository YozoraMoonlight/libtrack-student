import React, { useRef, useState } from 'react';
import { ChangeKindBadge } from '../components/app/ChangeKindBadge';
import { PageHeader } from '../components/app/PageHeader';
import { StatusBadge } from '../components/app/StatusBadge';
import { ShelfStackGame } from '../components/app/shelfStack/ShelfStackGame';
import { updateLogs } from '../data/updateLogs';
import { formatDate } from '../utils/format';
import { cn } from '../utils/cn';

const TAPS_TO_UNLOCK = 5;
const TAP_WINDOW_MS = 1500;

export function UpdateLogs() {
  const [gameOpen, setGameOpen] = useState(false);
  const taps = useRef<number[]>([]);

  // Secret: tap the very first version (where it all began) 5 times quickly
  function handleOriginTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_TO_UNLOCK) {
      taps.current = [];
      navigator.vibrate?.([10, 40, 10]);
      setGameOpen(true);
    }
  }

  return (
    <>
      <PageHeader title="Update Logs" subtitle="What’s changed in the LIBTRACK app." />

      <ol className="relative px-5">
        {updateLogs.map((log, index) => {
          const isLatest = index === 0;
          const isLast = index === updateLogs.length - 1;
          return (
            <li key={log.version} className="relative pb-7 pl-7">
              {!isLast ?
              <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-ink/10" /> :
              null}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full ring-4 ring-[rgb(var(--color-paper))]',
                  isLatest ? 'bg-brand-amber' : 'bg-ink/20'
                )} />
              

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2
                  onClick={isLast ? handleOriginTap : undefined}
                  className={cn(
                    'font-extrabold tracking-[-0.03em] text-ink',
                    isLatest ? 'text-xl' : 'text-base',
                    isLast && 'select-none'
                  )}>
                  
                  v{log.version}
                </h2>
                {isLatest ? <StatusBadge label="Latest" tone="success" /> : null}
                <time dateTime={log.date} className="text-xs text-ink/45">
                  {formatDate(log.date)}
                </time>
              </div>
              <p className={cn('mt-0.5 font-semibold', isLatest ? 'text-[15px] text-ink' : 'text-sm text-ink/70')}>
                {log.title}
              </p>

              <ul className={cn('mt-3 space-y-2.5', isLatest && 'rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]')}>
                {log.changes.map((change) =>
                <li key={change.text} className="flex items-start gap-2.5">
                    <ChangeKindBadge kind={change.kind} />
                    <span className="text-sm leading-5 text-ink/70">{change.text}</span>
                  </li>
                )}
              </ul>
            </li>);

        })}
      </ol>

      <ShelfStackGame open={gameOpen} onClose={() => setGameOpen(false)} />
    </>);

}