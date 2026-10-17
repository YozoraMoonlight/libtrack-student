import React, { useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';

interface ControlButtonProps {
  label: string;
  onPress: () => void;
  /** Keep firing while held down (moving and soft-dropping) */
  repeat?: boolean;
  tone?: 'default' | 'primary' | 'muted';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const REPEAT_DELAY = 160;
const REPEAT_EVERY = 50;

export function ControlButton({ label, onPress, repeat = false, tone = 'default', disabled = false, className, children }: ControlButtonProps) {
  const delay = useRef<number | undefined>(undefined);
  const interval = useRef<number | undefined>(undefined);
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  const stop = () => {
    window.clearTimeout(delay.current);
    window.clearInterval(interval.current);
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        // Keep receiving events even if the thumb slides a little off the button
        (event.currentTarget as HTMLButtonElement).setPointerCapture?.(event.pointerId);
        navigator.vibrate?.(4);
        pressRef.current();
        if (!repeat) return;
        stop();
        delay.current = window.setTimeout(() => {
          interval.current = window.setInterval(() => pressRef.current(), REPEAT_EVERY);
        }, REPEAT_DELAY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'flex select-none touch-none items-center justify-center transition-[background-color,transform,opacity] duration-100 ease-out active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]',
        tone === 'primary' && 'bg-brand-amber text-[#121212] shadow-card active:bg-brand-amberDark',
        tone === 'default' && 'bg-white text-ink shadow-card ring-1 ring-ink/[0.08] active:bg-ink/[0.06]',
        tone === 'muted' && 'bg-ink/[0.06] text-ink active:bg-ink/[0.12]',
        disabled && 'opacity-40',
        className
      )}>
      
      {children}
    </button>);

}