import React from 'react';
import { QrCodeIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Book } from '../../types/library';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  const isAvailable = book.available > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink/[0.06] transition-colors duration-150 ease-out active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
      aria-label={`${book.title} by ${book.author}. ${isAvailable ? `${book.available} of ${book.copies} copies available` : 'Not available'}. Show QR`}>
      
      <div className="flex w-[84px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff] p-2 ring-1 ring-ink/10">
        <QrCodeIcon className="h-10 w-10 text-[#121212]/65" strokeWidth={1.7} />
        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#121212]/55">
          <QrCodeIcon className="h-3 w-3" aria-hidden="true" />
          QR details
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">{book.title}</h3>
        <p className="mt-0.5 truncate text-[13px] text-ink/55">{book.author}</p>
        <p className="mt-2 text-xs font-semibold text-ink/70">{book.category}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[13px] text-ink/55">
            <span className="font-bold text-ink">{book.available}</span>/{book.copies} copies
          </p>
          <StatusBadge label={isAvailable ? 'Available' : 'Unavailable'} tone={isAvailable ? 'success' : 'danger'} />
        </div>
      </div>
    </button>);

}