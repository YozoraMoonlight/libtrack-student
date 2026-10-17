import React from 'react';
import { shelfBooks, type BookTone } from '../../data/bookshelf';
import { cn } from '../../utils/cn';

const toneClass: Record<BookTone, string> = {
  amber: 'bg-brand-amber',
  amberDark: 'bg-brand-amberDark',
  ember: 'bg-brand-ember',
  ink: 'bg-ink',
  paper: 'bg-white border border-ink/10'
};

const bandClass: Record<BookTone, string> = {
  amber: 'bg-ink/20',
  amberDark: 'bg-ink/20',
  ember: 'bg-cream/40',
  ink: 'bg-brand-amber/60',
  paper: 'bg-brand-amber'
};

export function Bookshelf() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none">
      <div className="flex items-end justify-center gap-[3px] overflow-hidden px-2">
        {shelfBooks.map((book, index) =>
        book.height < 30 ?
        <span key={index} className="shrink-0" style={{ width: book.width }} /> :

        <div
          key={index}
          className={cn('relative shrink-0 rounded-t-[3px]', toneClass[book.tone])}
          style={{
            width: book.width,
            height: book.height,
            transform: book.tilt ? `rotate(${book.tilt}deg)` : undefined,
            transformOrigin: book.tilt && book.tilt < 0 ? 'bottom left' : 'bottom right'
          }}>
          
              <span className={cn('absolute inset-x-[3px] top-[10px] h-[3px] rounded-full', bandClass[book.tone])} />
              <span className={cn('absolute inset-x-[3px] bottom-[10px] h-[3px] rounded-full', bandClass[book.tone])} />
            </div>

        )}
      </div>
      <div className="h-2.5 rounded-sm bg-shelf" />
    </div>);

}