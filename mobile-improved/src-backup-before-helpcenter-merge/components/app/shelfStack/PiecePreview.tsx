import React from 'react';
import { BOOK_COLORS, SHAPES } from '../../../hooks/useShelfStack';
import { cn } from '../../../utils/cn';
import { BookCell } from './BookCell';

interface PiecePreviewProps {
  label: string;
  kind: number | null;
  dimmed?: boolean;
}

/** Small boxed preview used for the Hold and Next slots. */
export function PiecePreview({ label, kind, dimmed = false }: PiecePreviewProps) {
  const shape = kind === null ? null : SHAPES[kind];

  return (
    <div>
      <p className="text-center text-[11px] font-bold text-ink/50">{label}</p>
      <div className="mt-1 flex h-[52px] items-center justify-center rounded-xl bg-white ring-1 ring-ink/[0.08]">
        {shape && kind !== null ?
        <div
          className={cn('grid gap-[2px] transition-opacity duration-150', dimmed && 'opacity-35')}
          style={{
            gridTemplateColumns: `repeat(${shape[0].length}, 10px)`,
            gridTemplateRows: `repeat(${shape.length}, 10px)`
          }}>
          
            {shape.flatMap((row, r) =>
          row.map((cell, c) =>
          cell ? <BookCell key={`${r}-${c}`} color={BOOK_COLORS[kind]} /> : <div key={`${r}-${c}`} />
          )
          )}
          </div> :

        <span className="text-[11px] text-ink/30">Empty</span>
        }
      </div>
    </div>);

}