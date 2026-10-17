import React from 'react';
import { cn } from '../../../utils/cn';

interface SpotProps {
  children: React.ReactNode;
  className?: string;
}

/** Sits above the dim layer so the step's focus stays bright. */
export function Spot({ children, className }: SpotProps) {
  return <div className={cn('relative z-20 rounded-xl ring-[5px] ring-[#ffffff]/90', className)}>{children}</div>;
}