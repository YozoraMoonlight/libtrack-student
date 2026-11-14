import React, { useEffect, useMemo, useState } from 'react';
import { ScanLineIcon, SearchIcon, SearchXIcon, ShoppingCartIcon, XIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BookCard } from '../components/app/BookCard';
import { BookCover } from '../components/app/BookCover';
import { PullToRefresh } from '../components/app/PullToRefresh';
import { SecretMoon } from '../components/app/SecretMoon';
import { BottomSheet } from '../components/app/BottomSheet';
import { LibraryQr } from '../components/app/LibraryQr';
import { PageHeader } from '../components/app/PageHeader';
import { QrScanner } from '../components/app/QrScanner';
import { StatusBadge } from '../components/app/StatusBadge';
import { ApiError, getBookQr, getBooks, lookupBorrowCartQr, type BorrowCartScan } from '../api/laravel';
import { mapBook } from '../api/adapters';
import { useBorrowCart } from '../api/borrowCart';
import { useRemotePage } from '../hooks/useRemotePage';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../utils/cn';
import type { Book } from '../types/library';

export function BrowseBooks() {
  const [query, setQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Book | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wantsPhysical, setWantsPhysical] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<BorrowCartScan | null>(null);
  const [scanSheetOpen, setScanSheetOpen] = useState(false);
  const [scanPhysical, setScanPhysical] = useState(false);
  const { user } = useAuth();
  const { add, states: cartStates, count: cartCount } = useBorrowCart();
  const navigate = useNavigate();
  const remote = useRemotePage(() => getBooks({
    search: submittedSearch,
    categoryId,
  }), user ? `books:${user.id}:${submittedSearch}:${categoryId || 'all'}` : null);

  const results = useMemo(() => {
    const pageStates = remote.data?.props?.bookStates;
    const borrowed = new Set((pageStates?.borrowed ?? []).map(Number));
    const reserved = new Set((pageStates?.reserved ?? []).map(Number));
    const inCart = new Set([...(pageStates?.cart ?? []).map(Number), ...cartStates.cart]);

    return (remote.data?.props?.books?.data || []).map((book) => {
      const id = Number(book.id);
      const state = borrowed.has(id)
        ? ('borrowed' as const)
        : reserved.has(id)
          ? ('reserved' as const)
          : inCart.has(id)
            ? ('cart' as const)
            : null;
      return mapBook(book, state);
    });
  }, [remote.data, cartStates.cart]);
  const categories = useMemo(
    () => ['All', ...(remote.data?.props?.categories || []).map((item) => item.name)],
    [remote.data],
  );
  const totalBooks = Number(remote.data?.props?.books?.total ?? results.length);
  const availableCount = results.filter((book) => book.available > 0).length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected) {
      setSelectedQr(null);
      return;
    }

    let active = true;
    setQrLoading(true);
    setSelectedQr(null);
    getBookQr(selected.id)
      .then((source) => {
        if (active) setSelectedQr(source);
      })
      .catch(() => {
        if (active) setSelectedQr(null);
      })
      .finally(() => {
        if (active) setQrLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selected]);

  function openBook(book: Book) {
    setSelected(book);
    setWantsPhysical(false);
    setActionError(null);
    setSheetOpen(true);
  }

  function applySearch() {
    setSubmittedSearch(query);
    remote.refresh();
  }

  function applyCategory(next: string) {
    const match = remote.data?.props?.categories?.find((item) => item.name === next);
    setCategory(next);
    setCategoryId(match?.id == null ? undefined : String(match.id));
    remote.refresh();
  }

  async function handleAdd(book: Book, copyId?: number | string, physical?: boolean) {
    setAdding(true);
    setActionError(null);
    const result = await add(book.id, { physical: physical ?? wantsPhysical, copyId });
    setAdding(false);
    if (result.ok) {
      setSheetOpen(false);
      setScanSheetOpen(false);
      setScanned(null);
      setToast(`“${book.title}” is in your Borrow Cart.`);
      remote.refresh();
    } else {
      setActionError(result.message || 'Could not add that book. Please try again.');
    }
  }

  function openScanner() {
    setScanError(null);
    setActionError(null);
    setScanned(null);
    setScanOpen(true);
  }

  async function handleScan(value: string) {
    setScanOpen(false);
    setScanBusy(true);
    setScanError(null);
    setActionError(null);
    try {
      const result = await lookupBorrowCartQr(value);
      setScanned(result);
      setScanPhysical(false);
      setScanSheetOpen(true);
    } catch (reason: unknown) {
      setScanError(
        reason instanceof ApiError
          ? reason.message
          : 'That QR code is not a book label from your school library.',
      );
    } finally {
      setScanBusy(false);
    }
  }

  const scannedBook = scanned ? mapBook({
    ...scanned.book,
    total_copies: scanned.book.available_copies,
    available_copies: scanned.book.available_copies,
  }, scanned.book.state ?? null) : null;
  const scanBlocked = Boolean(
    !scanned ||
    scanned.book.state ||
    (scanned.copy && !scanned.copy.available) ||
    Number(scanned.book.available_copies ?? 0) <= 0 ||
    (scanned.book.has_pdf && !scanPhysical),
  );

  return (
    <PullToRefresh onRefresh={async () => { remote.refresh(); }}>
      <PageHeader title="Browse Books" subtitle={`${availableCount} of ${totalBooks} titles available`} />

      <div className="sticky top-[62px] z-20 bg-paper pb-3">
        <div className="px-5">
          <label htmlFor="book-search" className="sr-only">Search books</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              id="book-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              placeholder="Search by title, author, or ISBN"
              className="h-12 w-full rounded-xl border border-ink/10 bg-white pl-12 pr-11 text-[15px] text-ink outline-none placeholder:text-ink/40 transition-[border-color,box-shadow] duration-150 focus:border-brand-amberDark focus:ring-4 focus:ring-brand-amber/25 [&::-webkit-search-cancel-button]:hidden" />

            {query ?
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSubmittedSearch('');
                remote.refresh();
              }}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink/45 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            >
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button> :
            null}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={openScanner}
              disabled={scanBusy}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-bold text-ink ring-1 ring-ink/10 active:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-60">
              <ScanLineIcon className="h-4 w-4 text-brand-ember" aria-hidden="true" />
              {scanBusy ? 'Looking up…' : 'Scan a shelf label'}
            </button>
            <Link
              to="/app/cart"
              className="relative flex h-10 items-center gap-1.5 rounded-xl bg-cream px-3 text-[13px] font-bold text-brand-ember ring-1 ring-brand-amberDark/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
              Cart
              {cartCount > 0 ?
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-ember px-1 text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span> :
              null}
            </Link>
          </div>

          {scanError ? (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300">
              {scanError}
            </p>
          ) : null}
          {toast ? (
            <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-semibold leading-5 text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {toast}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by category">
          {categories.map((item) => {
            const activeCategory = item === category;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={activeCategory}
                onClick={() => applyCategory(item)}
                className={cn(
                  'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                  activeCategory ? 'bg-ink text-white' : 'bg-white text-ink/65 ring-1 ring-ink/10 active:bg-ink/5',
                )}
              >
                {item === 'All' ? 'All categories' : item}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-label="Books" className="px-5 pt-1">
        {remote.error ?
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/15">
            {remote.error}
            <button type="button" className="ml-2 font-bold underline" onClick={remote.refresh}>Retry</button>
          </div> :
          <p className="mb-3 text-[13px] text-ink/50" aria-live="polite">
            {remote.loading ? 'Loading books…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
          </p>}
        {!remote.loading && results.length ?
        <ul className="space-y-3">
            {results.map((book) =>
            <li key={book.id}>
                <BookCard book={book} onSelect={openBook} />
              </li>
          )}
          </ul> :
          !remote.loading ?
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-ink/[0.06]">
            <SearchXIcon className="h-8 w-8 text-ink/30" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">No books found</p>
            <p className="mt-1 text-sm text-ink/55">{totalBooks === 0 ? 'No books are assigned to your school yet.' : 'Try another title, author, or category.'}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSubmittedSearch('');
                setCategory('All');
                setCategoryId(undefined);
                remote.refresh();
              }}
              className="mt-4 h-10 rounded-lg px-4 text-sm font-bold text-brand-ember hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            >
              Clear filters
            </button>
          </div> :
          null}
        <SecretMoon onUnlock={() => navigate('/night-shelf')} />
      </section>

      <BottomSheet open={sheetOpen} title="Book details" onClose={() => setSheetOpen(false)}>
        {selected ?
        <div className="max-h-[72dvh] overflow-y-auto overscroll-contain pb-3 pt-4">
            <div className="flex gap-3">
              <BookCover src={selected.cover} title={selected.title} className="h-[116px] w-[82px] shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold leading-tight tracking-[-0.03em] text-ink">{selected.title}</h3>
                <p className="mt-1 text-sm text-ink/55">{selected.author}</p>
                <p className="mt-2 text-xs font-semibold text-ink/60">{selected.category}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge label={selected.available > 0 ? 'Available' : 'Unavailable'} tone={selected.available > 0 ? 'success' : 'danger'} />
                  {selected.hasPdf ?
                  <StatusBadge label="PDF" tone="neutral" /> :
                  null}
                  {selected.state === 'cart' ?
                  <StatusBadge label="In your cart" tone="warning" /> :
                  selected.state === 'reserved' ?
                  <StatusBadge label="Set aside" tone="warning" /> :
                  selected.state === 'borrowed' ?
                  <StatusBadge label="Borrowed" tone="neutral" /> :
                  null}
                </div>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-ink/[0.07] border-y border-ink/[0.07] text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-ink/55">ISBN</dt>
                <dd className="font-semibold tabular-nums text-ink">{selected.isbn || '—'}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-ink/55">Copies</dt>
                <dd className="font-semibold text-ink">{selected.available}/{selected.copies} on the shelf</dd>
              </div>
              {selected.location ?
              <div className="flex justify-between py-3">
                  <dt className="text-ink/55">Location</dt>
                  <dd className="font-semibold text-ink">{selected.location}</dd>
                </div> :
              null}
            </dl>

            {selected.state === 'cart' ?
            <Link
              to="/app/cart"
              className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
              Open my Borrow Cart
            </Link> :
            selected.state === 'reserved' ?
            <p className="mt-5 rounded-xl bg-cream px-3 py-3 text-center text-[13px] leading-5 text-brand-ember">
              This title is already set aside for you. Collect it at the desk.
            </p> :
            selected.state === 'borrowed' ?
            <p className="mt-5 rounded-xl bg-ink/[0.04] px-3 py-3 text-center text-[13px] leading-5 text-ink/60">
              You already have this book on loan. Return it before borrowing another copy.
            </p> :
            <>
                {selected.hasPdf ?
              <label className="mt-4 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3 py-3 text-[13px] leading-5 text-sky-900 ring-1 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-200">
                    <input
                  type="checkbox"
                  checked={wantsPhysical}
                  onChange={(event) => setWantsPhysical(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600" />
                  
                    <span>This title also has a PDF. I want the physical copy, not just the online version.</span>
                  </label> :
              null}
                <button
                type="button"
                disabled={adding || selected.available <= 0 || (selected.hasPdf && !wantsPhysical)}
                onClick={() => void handleAdd(selected)}
                className={cn(
                  'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                  adding || selected.available <= 0 || (selected.hasPdf && !wantsPhysical)
                    ? 'bg-ink/10 text-ink/35'
                    : 'bg-brand-amber text-[#121212] active:bg-brand-amberDark',
                )}>
                
                  <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                  {adding ? 'Adding…' : selected.available <= 0 ? 'No copy on the shelf' : 'Add to Borrow Cart'}
                </button>
                {actionError ?
              <p className="mt-2 text-center text-xs text-red-700 dark:text-red-300">{actionError}</p> :
              null}
              </>
            }

            <div className="mt-6">
              <p className="text-sm font-bold text-ink">Book QR</p>
              <div className="mx-auto mt-2 w-fit rounded-2xl bg-[#fff] p-3 ring-1 ring-ink/10">
                <LibraryQr value={selected.isbn} imageSource={selectedQr} className="h-40 w-40" label={`QR code for ${selected.title}`} />
              </div>
              {qrLoading ? <p className="mt-1.5 text-center text-xs text-ink/50">Loading QR…</p> : null}
              <p className="mt-2 text-center text-[13px] leading-5 text-ink/55">
                Add the book to your Borrow Cart above, or show this code to the librarian.
              </p>
            </div>
          </div> :
        null}
      </BottomSheet>

      <BottomSheet open={scanSheetOpen} title="Scanned book" onClose={() => setScanSheetOpen(false)}>
        {scanned && scannedBook ?
        <div className="pb-3 pt-4">
            <div className="flex gap-3">
              <BookCover src={scanned.book.cover_image_url} title={scannedBook.title} className="h-[116px] w-[82px] shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-extrabold leading-tight tracking-[-0.03em] text-ink">{scannedBook.title}</h3>
                <p className="mt-1 text-sm text-ink/55">{scannedBook.author}</p>
                <p className="mt-2 text-xs text-ink/50">
                  {scanned.copy ? `Copy ${scanned.copy.label}` : 'Title label (no specific copy)'}
                  {' · '}
                  {Number(scanned.book.available_copies ?? 0)} on the shelf
                </p>
                {scanned.book.has_pdf ?
              <p className="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">Also available as a PDF</p> :
              null}
              </div>
            </div>

            {scanned.book.state === 'cart' ?
            <p className="mt-4 rounded-xl bg-cream px-3 py-3 text-center text-[13px] text-brand-ember">This title is already in your cart.</p> :
            scanned.book.state === 'reserved' ?
            <p className="mt-4 rounded-xl bg-cream px-3 py-3 text-center text-[13px] text-brand-ember">This title is already set aside for you.</p> :
            scanned.book.state === 'borrowed' ?
            <p className="mt-4 rounded-xl bg-ink/[0.04] px-3 py-3 text-center text-[13px] text-ink/60">You already have this book on loan.</p> :
            <>
                {scanned.copy && !scanned.copy.available ?
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-3 text-center text-[13px] text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200">
                    That copy is not available right now. Pick another copy from the shelf.
                  </p> :
              null}
                {scanned.book.has_pdf ?
              <label className="mt-4 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3 py-3 text-[13px] leading-5 text-sky-900 ring-1 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-200">
                    <input
                  type="checkbox"
                  checked={scanPhysical}
                  onChange={(event) => setScanPhysical(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600" />
                  
                    <span>This title also has a PDF. I want the physical copy.</span>
                  </label> :
              null}
                <button
                type="button"
                disabled={adding || scanBlocked}
                onClick={() => void handleAdd(scannedBook, scanned.copy?.id, scanPhysical)}
                className={cn(
                  'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                  adding || scanBlocked ? 'bg-ink/10 text-ink/35' : 'bg-brand-amber text-[#121212] active:bg-brand-amberDark',
                )}>
                
                  <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                  {adding ? 'Adding…' : 'Add scanned book to cart'}
                </button>
                {actionError ?
              <p className="mt-2 text-center text-xs text-red-700 dark:text-red-300">{actionError}</p> :
              null}
              </>
            }
          </div> :
        null}
      </BottomSheet>

      {scanOpen ? <QrScanner onScan={(value) => void handleScan(value)} onCancel={() => setScanOpen(false)} /> : null}
    </PullToRefresh>
  );
}
