import React from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function PrimaryButton({ children, loading = false, className, disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-base font-bold text-white outline-none',
        'transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.985] active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40',
        'disabled:cursor-not-allowed disabled:bg-ink/40 disabled:active:scale-100',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}>
      
      {loading ? <LoaderCircleIcon aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
      <span>{children}</span>
    </button>);

}