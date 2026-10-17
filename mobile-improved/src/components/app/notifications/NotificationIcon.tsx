import React from 'react';
import { BookOpenIcon, LockOpenIcon, ReceiptIcon, RotateCcwIcon, UserCogIcon } from 'lucide-react';
import type { NotificationKind } from '../../../types/notifications';
import { cn } from '../../../utils/cn';

const icons: Record<NotificationKind, typeof UserCogIcon> = {
  account: UserCogIcon,
  borrow: BookOpenIcon,
  return: RotateCcwIcon,
  fine: ReceiptIcon,
  hold: LockOpenIcon
};

export function NotificationIcon({ kind, className }: {kind: NotificationKind;className?: string;}) {
  const Icon = icons[kind];
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300', className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>);

}