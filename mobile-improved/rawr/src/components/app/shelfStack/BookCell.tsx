import React from 'react';
import { cn } from '../../../utils/cn';

interface BookCellProps {
  color?: string;
  ghost?: boolean;
  flash?: boolean;
}

/** One grid square, drawn as a little book spine. */
export function BookCell({ color, ghost = false, flash = false }: BookCellProps) {
  if (!color) {
    return ghost ?
    <div className="rounded-[3px] border border-dashed border-ink/25" /> :

    <div className="rounded-[2px] bg-ink/[0.035]" />;

  }

  return (
    <div
      className="relative overflow-hidden rounded-[3px] transition-colors duration-100"
      style={{ backgroundColor: flash ? '#ffffff' : color, boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.18)' }}>
      
      {!flash ?
      <>
          <span aria-hidden="true" className="absolute inset-x-[18%] top-[18%] h-[10%] rounded-full bg-white/45" />
          <span aria-hidden="true" className="absolute inset-x-[18%] bottom-[18%] h-[10%] rounded-full bg-white/30" />
        </> :
      null}
    </div>);

}