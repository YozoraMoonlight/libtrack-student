import React, { useMemo, useState } from 'react';
import { ArrowLeftIcon, BookOpenIcon, ShoppingCartIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PdfReader } from '../components/books/PdfReader';
import { useAuth } from '../auth/AuthContext';
import { useBorrowCart } from '../api/borrowCart';
import { getBookRead } from '../api/laravel';
import { useRemotePage } from '../hooks/useRemotePage';
import { cn } from '../utils/cn';

function formatSize(bytes: number | null | undefined): string | null {
  if (!bytes || !Number.isFinite(bytes)) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReadBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add, states: cartStates } = useBorrowCart();
  const remote = useRemotePage(
    () => getBookRead(id || ''),
    user && id ? `book-read:${user.id}:${id}` : null,
  );
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const book = remote.data?.props?.book;
  const pageStates = remote.data?.props?.bookStates;
  const borrowed = new Set([...(pageStates?.borrowed ?? []), ...(cartStates.borrowed ?? [])].map(Number));
  const reserved = new Set([...(pageStates?.reserved ?? []), ...(cartStates.reserved ?? [])].map(Number));
  const inCart = new Set([...(pageStates?.cart ?? []), ...(cartStates.cart ?? [])].map(Number));
  const bookId = Number(book?.id ?? id);

  const state = useMemo(() => {
    if (!Number.isFinite(bookId)) return null;
    if (borrowed.has(bookId)) return 'borrowed' as const;
    if (reserved.has(bookId)) return 'reserved' as const;
    if (inCart.has(bookId)) return 'cart' as const;
    return null;
  }, [bookId, borrowed, reserved, inCart]);

  const size = formatSize(book?.pdf_size);

  async function handleAddPhysical() {
    if (!book) return;
    setAdding(true);
    setMessage(null);
    const result = await add(book.id, { physical: true });
    setAdding(false);
    if (result.ok) {
      setMessage({ type: 'success', text: '“' + book.title + '” is in your Borrow Cart.' });
      remote.refresh();
    } else {
      setMessage({ type: 'error', text: result.message || 'Could not add that book. Please try again.' });
    }
  }

  return (
    <div className="px-5 pb-6">
      <div className="flex items-center gap-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink ring-1 ring-ink/10 active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold tracking-[-0.03em] text-ink">{book?.title || 'Read book'}</h1>
          <p className="truncate text-[13px] text-ink/55">
            {book?.author || 'Loading…'}
            {size ? ` · PDF, ${size}` : ''}
          </p>
        </div>
      </div>

      {remote.error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300">
          <p>{remote.error}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={remote.refresh} className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-red-800 ring-1 ring-red-600/20">Retry</button>
            <Link to="/app/browse" className="rounded-lg px-3 py-1.5 text-sm font-bold text-red-800 underline">Back to Browse</Link>
          </div>
        </div>
      ) : remote.loading || !book ? (
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-2 text-sm text-ink/55">
          <BookOpenIcon className="h-8 w-8 text-ink/25" aria-hidden="true" />
          <p>Opening the book…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Reading the PDF is not a loan. Nothing is borrowed, so there is no due date and no fine. The PDF can be read here only — it can’t be downloaded or printed.
          </p>

          <PdfReader url={book.pdf_url} title={book.title} />

          <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
            <p className="text-sm font-bold text-ink">Need the physical book?</p>
            <p className="mt-1 text-[13px] leading-5 text-ink/55">
              You can read the PDF here, and you can also ask to borrow the printed copy.
            </p>

            {state === 'cart' ? (
              <Link
                to="/app/cart"
                className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                Open my Borrow Cart
              </Link>
            ) : state === 'reserved' ? (
              <p className="mt-3 rounded-xl bg-cream px-3 py-3 text-center text-[13px] leading-5 text-brand-ember">
                This title is already set aside for you. Collect it at the desk.
              </p>
            ) : state === 'borrowed' ? (
              <p className="mt-3 rounded-xl bg-ink/[0.04] px-3 py-3 text-center text-[13px] leading-5 text-ink/60">
                You already have this book on loan.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={adding || Number(book.available_copies ?? 0) <= 0}
                  onClick={() => void handleAddPhysical()}
                  className={cn(
                    'mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                    adding || Number(book.available_copies ?? 0) <= 0
                      ? 'bg-ink/10 text-ink/35'
                      : 'bg-brand-amber text-[#121212] active:bg-brand-amberDark',
                  )}>
                  <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                  {adding ? 'Adding…' : Number(book.available_copies ?? 0) <= 0 ? 'No copy on the shelf' : 'Add physical copy to cart'}
                </button>
                {message ? (
                  <p className={cn('mt-2 text-center text-xs', message.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                    {message.text}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
