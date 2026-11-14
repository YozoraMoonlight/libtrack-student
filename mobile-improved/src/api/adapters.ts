import type { ActiveLoan, LiveBook, LiveBorrowing, LiveFine } from './laravel';
import type { Book, Borrowing, Fine } from '../types/library';

export function mapBook(book: LiveBook, state?: Book['state']): Book {
  return {
    id: String(book.id),
    title: String(book.title || 'Untitled book'),
    author: String(book.author || 'Unknown author'),
    category: String(book.category?.name || 'Uncategorized'),
    isbn: String(book.isbn || ''),
    copies: Number(book.total_copies || 0),
    available: Number(book.available_copies || 0),
    cover: book.cover_image_url ? String(book.cover_image_url) : null,
    hasPdf: Boolean(book.has_pdf),
    location: book.location ? String(book.location) : '',
    state: state ?? null,
  };
}

export function mapBorrowing(transaction: LiveBorrowing): Borrowing {
  const status = String(transaction.status || 'active').toLowerCase();
  const statusLabel: Borrowing['status'] = status === 'returned' ? 'Returned' : status === 'overdue' ? 'Overdue' : 'Borrowed';
  const fines = Array.isArray(transaction.fines) ? transaction.fines : [];
  const fine = fines.length
    ? fines.reduce((sum, item) => sum + Number(item.amount || 0) - Number(item.paid_amount || 0), 0)
    : null;

  return {
    id: String(transaction.id),
    bookTitle: String(transaction.book?.title || 'Unknown book'),
    borrowed: transaction.borrowed_at || '',
    due: transaction.due_date || '',
    returned: transaction.returned_at || null,
    status: statusLabel,
    fine,
    returnRequestedAt: transaction.return_requested_at ?? null,
    returnRequestedMethod: transaction.return_requested_method ?? null,
  };
}

export function mapActiveLoan(loan: ActiveLoan): Borrowing {
  const status = String(loan.status || 'active').toLowerCase();
  const statusLabel: Borrowing['status'] = status === 'returned' ? 'Returned' : status === 'overdue' ? 'Overdue' : 'Borrowed';

  return {
    id: String(loan.id),
    bookTitle: String(loan.book_title || 'Unknown book'),
    borrowed: loan.borrowed_at || '',
    due: loan.due_date || '',
    returned: null,
    status: statusLabel,
    fine: null,
    returnRequestedAt: loan.return_requested_at ?? null,
    returnRequestedMethod: loan.return_request_method ?? null,
  };
}

export function mapFine(fine: LiveFine): Fine {
  const status = String(fine.status || 'unpaid').toLowerCase();
  const amount = Number(fine.amount || 0);
  const paid = Number(fine.paid_amount || 0);
  const type = String(fine.type || 'fine');

  return {
    id: String(fine.id),
    bookTitle: String(fine.transaction?.book?.title || 'Library fine'),
    type: type.charAt(0).toUpperCase() + type.slice(1),
    amount,
    paid,
    status: status === 'paid' || status === 'waived' ? 'Paid' : 'Unpaid',
    date: fine.created_at || '',
  };
}
