import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';

export function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy');
}

export function formatShortDate(iso: string) {
  return format(parseISO(iso), 'MMM d');
}

/**
 * Plain countdown to a due date, in calendar days (local).
 * "3 days left", "1 day left", "Due today", "Overdue by 2 days".
 */
export function dueCountdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const days = differenceInCalendarDays(parseISO(iso), startOfDay(new Date()));
    if (days > 1) return `${days} days left`;
    if (days === 1) return '1 day left';
    if (days === 0) return 'Due today';
    const over = Math.abs(days);
    return over === 1 ? 'Overdue by 1 day' : `Overdue by ${over} days`;
  } catch {
    return null;
  }
}