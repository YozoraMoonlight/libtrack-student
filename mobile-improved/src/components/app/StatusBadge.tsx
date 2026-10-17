import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'success' | 'danger' | 'warning' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/25',
  warning: 'bg-cream text-brand-ember ring-brand-amberDark/40',
  neutral: 'bg-ink/5 text-ink/60 ring-ink/10'
};

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold ring-1 ring-inset',
        toneClasses[tone],
        className
      )}>
      
      {label}
    </span>);

}