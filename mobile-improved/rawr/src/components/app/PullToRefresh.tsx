import React from 'react';
import { FlippingBook } from './FlippingBook';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const settle = 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)';

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { pull, dragging, refreshing, progress, handlers } = usePullToRefresh(onRefresh);
  const active = pull > 0 || refreshing;

  return (
    <div {...handlers} className="relative">
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden"
        style={{ height: pull, opacity: refreshing ? 1 : progress }}>
        
        <FlippingBook progress={progress} flipping={refreshing} />
      </div>
      <p role="status" className="sr-only">
        {refreshing ? 'Refreshing' : ''}
      </p>
      <div
        style={{
          transform: active ? `translateY(${pull}px)` : undefined,
          transition: dragging ? 'none' : settle
        }}>
        
        {children}
      </div>
    </div>);

}