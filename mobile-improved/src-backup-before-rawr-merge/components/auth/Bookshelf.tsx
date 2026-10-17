import React from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { shelfBooks, type BookTone, type ShelfBook } from '../../data/bookshelf';
import { cn } from '../../utils/cn';
import { sparklePath } from '../../utils/sparkle';

interface BookshelfProps {
  onSecretBook?: () => void;
}

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

export function Bookshelf({ onSecretBook }: BookshelfProps) {
  return (
    <div className="select-none">
      <div className="flex items-end justify-center gap-[3px] overflow-hidden px-2 pt-6">
        {shelfBooks.map((book, index) => {
          if (book.height < 30) return <span key={index} aria-hidden="true" className="shrink-0" style={{ width: book.width }} />;
          if (book.secret && onSecretBook) return <SecretBook key={index} book={book} onOpen={onSecretBook} />;
          return (
            <div
              key={index}
              aria-hidden="true"
              className={cn('relative shrink-0 rounded-t-[3px]', toneClass[book.tone])}
              style={{
                width: book.width,
                height: book.height,
                transform: book.tilt ? `rotate(${book.tilt}deg)` : undefined,
                transformOrigin: book.tilt && book.tilt < 0 ? 'bottom left' : 'bottom right'
              }}>
              
              <Bands tone={book.tone} />
            </div>);

        })}
      </div>
      <div aria-hidden="true" className="h-2.5 rounded-sm bg-shelf" />
    </div>);

}

function SecretBook({ book, onOpen }: {book: ShelfBook;onOpen: () => void;}) {
  const controls = useAnimationControls();
  const tilt = book.tilt ?? 0;

  function handleClick() {
    onOpen();
    void controls.start({
      y: [0, -16, -16, 0],
      rotate: [tilt, 0, 0, tilt],
      transition: { duration: 0.7, times: [0, 0.3, 0.7, 1], ease: [0.23, 1, 0.32, 1] }
    });
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      animate={controls}
      initial={{ rotate: tilt }}
      aria-label="A mysterious old book"
      className={cn(
        'relative shrink-0 rounded-t-[3px] outline-none focus-visible:ring-2 focus-visible:ring-brand-ember focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
        toneClass[book.tone]
      )}
      style={{ width: book.width, height: book.height, originX: tilt < 0 ? 0 : 1, originY: 1 }}>
      
      <Bands tone={book.tone} />
      {/* A faint sigil on the spine is the only hint */}
      <svg viewBox="-6 -6 12 12" aria-hidden="true" className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2">
        <path d={sparklePath(5)} className="fill-ink/35" />
      </svg>
    </motion.button>);

}

function Bands({ tone }: {tone: BookTone;}) {
  return (
    <>
      <span className={cn('absolute inset-x-[3px] top-[10px] h-[3px] rounded-full', bandClass[tone])} />
      <span className={cn('absolute inset-x-[3px] bottom-[10px] h-[3px] rounded-full', bandClass[tone])} />
    </>);

}