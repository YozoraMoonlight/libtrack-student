/**
 * Builds notifications from live circulation data.
 *
 * The server's notification table only ever receives `due_reminder` and
 * `overdue_notice`, both from cron. Nothing writes a row when a student borrows
 * a book, returns one, or settles a fine, so those events are derived here from
 * the same `/borrowings` and `/my-fines` payloads the screens already load.
 *
 * Ids are stable and prefixed (`borrowed:12`, `fine_added:4`, `fine_paid:4`) so
 * re-deriving on every load does not duplicate anything, and read/dismiss state
 * survives.
 */

import type { ActiveLoan, LiveBorrowing, LiveFine } from './laravel';
import type { AppNotification, NotificationKind } from '../types/notifications';

export type ActivityEvent = AppNotification & {
  /** Set when the row came from the server feed rather than being derived. */
  fromServer?: boolean;
};

function money(value: number | string | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value ?? 0);
  return `₱${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * The three sources disagree on shape, which is why this reads all three:
 *
 *   activeLoans  -> flat `book_title`  (BorrowingController maps it by hand)
 *   borrowings   -> nested `book.title`
 *   fines        -> nested `transaction.book.title`
 *
 * Reading only the nested form made every "Book borrowed" say "Untitled".
 */
function bookTitleOf(row: ActiveLoan | LiveBorrowing | LiveFine): string {
  const flat = (row as ActiveLoan).book_title;
  if (flat) return String(flat);

  const nested = (row as LiveBorrowing).book?.title;
  if (nested) return String(nested);

  const viaFine = (row as LiveFine).transaction?.book?.title;
  if (viaFine) return String(viaFine);

  return 'this book';
}

function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/** Books handed out that are still with the student. */
function borrowedEvents(activeLoans: ActiveLoan[]): ActivityEvent[] {
  return activeLoans
    .filter((loan) => Boolean(loan.borrowed_at))
    .map((loan) => {
      const title = bookTitleOf(loan);
      const due = shortDate(loan.due_date);
      const overdue = loan.due_date ? new Date(loan.due_date).getTime() < Date.now() : false;

      return {
        id: `borrowed:${loan.id}`,
        kind: (overdue ? 'borrow' : 'borrow') as NotificationKind,
        title: 'Book borrowed',
        body: overdue
          ? `"${title}" is overdue${due ? ` — was due ${due}` : ''}. Return it to avoid further fines.`
          : `"${title}" is due${due ? ` on ${due}` : ' soon'}.`,
        actor: 'LIBTRACK Library',
        time: String(loan.borrowed_at ?? ''),
        unread: true,
      };
    });
}

/** Books the librarian has closed out. */
function returnedEvents(transactions: LiveBorrowing[]): ActivityEvent[] {
  return transactions
    .filter((row) => Boolean(row.returned_at))
    .map((row) => {
      const title = bookTitleOf(row);
      const when = shortDate(row.returned_at);
      return {
        id: `returned:${row.id}`,
        kind: 'return' as NotificationKind,
        title: 'Book returned',
        body: `"${title}" was returned${when ? ` on ${when}` : ''}. You can borrow it again.`,
        actor: 'LIBTRACK Library',
        time: String(row.returned_at ?? ''),
        unread: true,
      };
    });
}

/**
 * Whether a fine is still outstanding.
 *
 * Deliberately the exact inverse of the filter in `finePaidEvents`, so a fine
 * can never satisfy both and produce two contradictory notifications ("Fine
 * added" and "Fine paid" for the same row).
 */
function isOutstanding(fine: LiveFine): boolean {
  const status = String(fine.status ?? '').toLowerCase();
  if (status === 'paid' || status === 'waived') return false;

  const amount = Number(fine.amount ?? 0);
  const paid = Number(fine.paid_amount ?? 0);
  return !(amount > 0 && paid >= amount);
}

/**
 * Fines the librarian has just raised and are not yet settled.
 *
 * These produced no notification at all before. `finePaidEvents` only ever fired
 * on `paid`/`waived`, so the moment that actually matters to a student - "you
 * now owe money" - was silent, and the only way to find out was to open the
 * Fines screen and look.
 *
 * The wording is deliberately about the obligation rather than blame: it names
 * the amount and what is owed, and points at the Fines screen for the rest.
 */
function fineAddedEvents(fines: LiveFine[]): ActivityEvent[] {
  return fines
    .filter(isOutstanding)
    .map((fine) => {
      const title = bookTitleOf(fine);
      const amount = Number(fine.amount ?? 0);
      const outstanding = Math.max(amount - Number(fine.paid_amount ?? 0), 0);
      // A fine with no book behind it is a general charge, not a book penalty.
      const subject = title === 'this book' ? '' : ` for "${title}"`;
      const kind = titleCase(String(fine.type ?? 'fine')).toLowerCase();
      const shown = money(outstanding > 0 ? outstanding : amount);

      return {
        id: `fine_added:${fine.id}`,
        kind: 'fine' as NotificationKind,
        title: 'Fine added',
        body: `A ${kind} of ${shown}${subject} was added to your account. Open Fines to see the details.`,
        actor: String(fine.actor ?? 'LIBTRACK Library'),
        time: String(fine.created_at ?? ''),
        unread: true,
      };
    });
}

/** Fines that have been settled in full or written off. */
function finePaidEvents(fines: LiveFine[]): ActivityEvent[] {
  return fines
    .filter((fine) => !isOutstanding(fine))
    .map((fine) => {
      const title = bookTitleOf(fine);
      const waived = String(fine.status ?? '').toLowerCase() === 'waived';
      const paid = Number(fine.paid_amount ?? 0);
      const amount = Number(fine.amount ?? 0);
      const usePaid = paid > 0 ? paid : amount;

      return {
        id: `fine_paid:${fine.id}`,
        kind: 'fine' as NotificationKind,
        title: waived ? 'Fine waived' : 'Fine paid',
        body: waived
          ? `The ${titleCase(String(fine.type ?? 'fine')).toLowerCase()} fine on "${title}" was cleared.`
          : `You paid ${money(usePaid)} for the ${titleCase(String(fine.type ?? 'fine')).toLowerCase()} fine on "${title}".`,
        actor: 'LIBTRACK Library',
        time: String(fine.paid_at ?? fine.created_at ?? ''),
        unread: true,
      };
    });
}

export function buildActivityNotifications(input: {
  activeLoans?: ActiveLoan[];
  transactions?: LiveBorrowing[];
  fines?: LiveFine[];
}): ActivityEvent[] {
  const events = [
    ...borrowedEvents(input.activeLoans ?? []),
    ...returnedEvents(input.transactions ?? []),
    ...fineAddedEvents(input.fines ?? []),
    ...finePaidEvents(input.fines ?? []),
  ];

  // Newest first; anything without a usable timestamp sinks to the bottom.
  return events.sort((a, b) => {
    const left = a.time ? new Date(a.time).getTime() : 0;
    const right = b.time ? new Date(b.time).getTime() : 0;
    return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
  });
}
