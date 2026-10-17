import React from 'react';
import { BookOpenIcon } from 'lucide-react';
import { useAppIconVariant } from '../../contexts/AppIconContext';
import { cn } from '../../utils/cn';

interface AppIconProps {
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: { tile: 'h-9 w-9 rounded-[11px]', glyph: 'h-[18px] w-[18px]', letter: 'text-[19px]' },
  md: { tile: 'h-11 w-11 rounded-[14px]', glyph: 'h-[22px] w-[22px]', letter: 'text-[23px]' }
};

/** The LIBTRACK app icon tile. Variant comes from the app-level Controls setting. */
export function AppIcon({ size = 'md', className }: AppIconProps) {
  const variant = useAppIconVariant();
  const s = SIZES[size];

  if (variant === 'bookmark') {
    return (
      <span aria-hidden="true" className={cn('flex items-center justify-center bg-[#121212] ring-1 ring-white/10', s.tile, className)}>
        <svg viewBox="0 0 24 24" className={s.glyph}>
          <path d="M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v17.2L12 17l-6.5 4.2V4A1.5 1.5 0 0 1 7 2.5Z" fill="#f6b93d" />
          <path d="m9 9.6 2.2 2.2L15.2 7.6" fill="none" stroke="#121212" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>);

  }

  if (variant === 'shelf') {
    return (
      <span aria-hidden="true" className={cn('flex items-center justify-center bg-brand-amber text-[#121212]', s.tile, className)}>
        <svg viewBox="0 0 24 24" className={s.glyph} fill="currentColor">
          <rect x="3.5" y="6" width="4" height="13.5" rx="1" />
          <rect x="8.75" y="3.5" width="4" height="16" rx="1" />
          <rect x="14.2" y="7" width="4" height="12.5" rx="1" transform="rotate(14 18.2 19.5)" />
          <rect x="2" y="20.25" width="20" height="2" rx="1" />
        </svg>
      </span>);

  }

  if (variant === 'monogram') {
    return (
      <span aria-hidden="true" className={cn('relative flex items-center justify-center bg-brand-amber text-[#121212]', s.tile, className)}>
        <span className={cn('font-extrabold leading-none tracking-[-0.06em]', s.letter)}>L</span>
        <span className="absolute right-[22%] top-[22%] h-[18%] w-[18%] rounded-full bg-[#121212]" />
      </span>);

  }

  return (
    <span aria-hidden="true" className={cn('flex items-center justify-center bg-brand-amber text-[#121212]', s.tile, className)}>
      <BookOpenIcon className={s.glyph} strokeWidth={2.25} />
    </span>);

}