import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ReturnShelfProps {
  books: Array<{id: string;title: string;}>;
}

const SPINES = ['#f6b93d', '#d9682b', '#474c6e', '#2f7d6d', '#b8553a'];
const HEIGHTS = [44, 50, 40, 48, 46];

/** A little shelf that fills up as books are returned this session. */
export function ReturnShelf({ books }: ReturnShelfProps) {
  const reduceMotion = useReducedMotion();
  if (!books.length) return null;
  const latest = books[books.length - 1];

  return (
    <div className="mt-3 flex items-end gap-4 rounded-xl bg-paper px-4 pb-3 pt-4">
      <div className="relative flex-1">
        <div className="flex h-[52px] items-end gap-1 px-1">
          {books.map((book, index) =>
          <motion.span
            key={book.id}
            title={book.title}
            className="block w-4 rounded-t-[3px]"
            style={{ height: HEIGHTS[index % HEIGHTS.length], backgroundColor: SPINES[index % SPINES.length] }}
            initial={reduceMotion ? { opacity: 0 } : { y: -56, opacity: 0, rotate: -10 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 20 }} />

          )}
        </div>
        <div aria-hidden="true" className="h-1.5 rounded-full bg-shelf" />
      </div>
      <div className="w-32 shrink-0 pb-1 text-right" aria-live="polite">
        <p className="text-sm font-bold text-ink">
          {books.length} returned
        </p>
        <p className="truncate text-xs text-ink/50">{latest.title}</p>
      </div>
    </div>);

}