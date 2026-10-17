import React from 'react';
import type { ChangeKind } from '../../data/updateLogs';
import { cn } from '../../utils/cn';

const kindStyles: Record<ChangeKind, string> = {
  New: 'bg-brand-amber/20 text-brand-ember',
  Improved: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  Fixed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
};

export function ChangeKindBadge({ kind, className }: {kind: ChangeKind;className?: string;}) {
  return (
    <span className={cn('mt-px w-[68px] shrink-0 rounded-md py-0.5 text-center text-[11px] font-bold', kindStyles[kind], className)}>
      {kind}
    </span>);

}