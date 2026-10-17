import React from 'react';
import { createPortal } from 'react-dom';

const spines = [
{ height: 44, color: 'bg-ink', delay: '0ms' },
{ height: 56, color: 'bg-brand-amber', delay: '120ms' },
{ height: 40, color: 'bg-brand-ember', delay: '240ms' },
{ height: 52, color: 'bg-brand-amberDark', delay: '360ms' }];


export function LoginLoader() {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream">
      
      <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
        {spines.map((spine) =>
        <span
          key={spine.delay}
          className={`book-spine block w-3.5 rounded-[3px] ${spine.color}`}
          style={{ height: spine.height, animationDelay: spine.delay }} />

        )}
      </div>
      <div className="mt-1 h-1 w-24 rounded-full bg-ink/80" aria-hidden="true" />

      <p className="mt-7 text-[19px] font-extrabold tracking-[-0.04em] text-ink">Signing you in</p>
      <p className="mt-1 text-[14px] text-ink/55">Opening your library…</p>
    </div>,
    document.body
  );
}