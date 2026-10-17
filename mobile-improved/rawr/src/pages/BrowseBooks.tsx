import React, { useMemo, useState } from 'react';
import { SearchIcon, SearchXIcon, XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookCard } from '../components/app/BookCard';
import { SecretMoon } from '../components/app/SecretMoon';
import { BottomSheet } from '../components/app/BottomSheet';
import { PageHeader } from '../components/app/PageHeader';
import { PullToRefresh } from '../components/app/PullToRefresh';
import { QrCode } from '../components/app/QrCode';
import { StatusBadge } from '../components/app/StatusBadge';
import { books } from '../data/books';
import { wait } from '../utils/async';
import { cn } from '../utils/cn';
import type { Book } from '../types/library';

export function BrowseBooks() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Book | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  function openBook(book: Book) {
    setSelected(book);
    setSheetOpen(true);
  }

  const categories = useMemo(() => ['All', ...Array.from(new Set(books.map((book) => book.category))).sort()], []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === 'All' || book.category === category;
      const matchesQuery =
      !q || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q) || book.isbn.includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const availableCount = books.filter((book) => book.available > 0).length;

  return (
    <PullToRefresh onRefresh={() => wait(900)}>
      <PageHeader title="Browse Books" subtitle={`${availableCount} of ${books.length} titles available`} />

      <div className="sticky top-[62px] z-20 bg-paper pb-3">
        <div className="px-5">
          <label htmlFor="book-search" className="sr-only">
            Search books
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              id="book-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author, or ISBN"
              className="h-12 w-full rounded-xl border border-ink/10 bg-white pl-12 pr-11 text-[15px] text-ink outline-none placeholder:text-ink/40 transition-[border-color,box-shadow] duration-150 focus:border-brand-amberDark focus:ring-4 focus:ring-brand-amber/25 [&::-webkit-search-cancel-button]:hidden" />
            
            {query ?
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink/45 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button> :
            null}
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by category">
          {categories.map((item) => {
            const active = item === category;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item)}
                className={cn(
                  'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
                  active ? 'bg-ink text-white' : 'bg-white text-ink/65 ring-1 ring-ink/10 active:bg-ink/5'
                )}>
                
                {item === 'All' ? 'All categories' : item}
              </button>);

          })}
        </div>
      </div>

      <section aria-label="Books" className="px-5 pt-1">
        <p className="mb-3 text-[13px] text-ink/50" aria-live="polite">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>
        {results.length ?
        <ul className="space-y-3">
            {results.map((book) =>
          <li key={book.id}>
                <BookCard book={book} onSelect={openBook} />
              </li>
          )}
          </ul> :

        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-ink/[0.06]">
            <SearchXIcon className="h-8 w-8 text-ink/30" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">No books found</p>
            <p className="mt-1 text-sm text-ink/55">Try another title, author, or category.</p>
            <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('All');
            }}
            className="mt-4 h-10 rounded-lg px-4 text-sm font-bold text-brand-ember hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
              Clear filters
            </button>
          </div>
        }
        <SecretMoon onUnlock={() => navigate('/night-shelf')} />
      </section>

      <BottomSheet open={sheetOpen} title="Book QR" onClose={() => setSheetOpen(false)}>
        {selected ?
        <div className="pt-4">
            <div className="mx-auto w-fit rounded-2xl bg-[#fff] p-4 ring-1 ring-ink/10">
              <QrCode value={selected.isbn} className="h-48 w-48" label={`QR code for ${selected.title}`} />
            </div>
            <div className="mt-5 text-center">
              <h3 className="text-xl font-extrabold tracking-[-0.03em] text-ink">{selected.title}</h3>
              <p className="mt-1 text-sm text-ink/55">{selected.author}</p>
            </div>
            <dl className="mt-5 divide-y divide-ink/[0.07] border-y border-ink/[0.07] text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-ink/55">Category</dt>
                <dd className="font-semibold text-ink">{selected.category}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-ink/55">ISBN</dt>
                <dd className="font-semibold tabular-nums text-ink">{selected.isbn}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink/55">Copies</dt>
                <dd className="flex items-center gap-2 font-semibold text-ink">
                  {selected.available}/{selected.copies}
                  <StatusBadge
                  label={selected.available > 0 ? 'Available' : 'Unavailable'}
                  tone={selected.available > 0 ? 'success' : 'danger'} />
                
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-center text-[13px] leading-5 text-ink/55">
              {selected.available > 0 ?
            'Show this code to the librarian to borrow this book.' :
            'All copies are out. Check back later or ask the librarian.'}
            </p>
          </div> :
        null}
      </BottomSheet>
    </PullToRefresh>);

}