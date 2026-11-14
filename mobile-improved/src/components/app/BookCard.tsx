import React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { BookCover } from './BookCover';
import { StatusBadge } from './StatusBadge';
import type { Book } from '../../types/library';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  const isAvailable = book.available > 0;
  const stateLabel =
    book.state === 'cart' ? 'In your cart' : book.state === 'reserved' ? 'Set aside for you' : book.state === 'borrowed' ? 'On loan' : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="flex w-full items-center gap-3.5 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.06] transition-colors duration-150 ease-out active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
      aria-label={`${book.title} by ${book.author}. ${isAvailable ? `${book.available} of ${book.copies} copies available` : 'Not available'}.${stateLabel ? ` ${stateLabel}.` : ''} Open details`}>

      <BookCover src={book.cover} title={book.title} className="h-[96px] w-[68px] shrink-0" />

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">{book.title}</h3>
        <p className="mt-0.5 truncate text-[13px] text-ink/55">{book.author}</p>
        <p className="mt-2 text-xs font-semibold text-ink/70">{book.category}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[13px] text-ink/55">
            <span className={isAvailable ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-red-600 dark:text-red-400'}>
              {book.available}
            </span>
            {' of '}
            {book.copies} available
          </p>
          {book.state ?
          <span className="shrink-0 rounded-md bg-cream px-1.5 py-0.5 text-[11px] font-bold text-brand-ember">
              {stateLabel}
            </span> :
          <StatusBadge label={isAvailable ? 'Available' : 'Unavailable'} tone={isAvailable ? 'success' : 'danger'} />}
        </div>
      </div>

      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/25" aria-hidden="true" />
    </button>
  );
}
