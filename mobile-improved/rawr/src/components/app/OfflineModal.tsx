import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircleIcon, WifiOffIcon } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineModalProps {
  simulateOffline?: boolean;
}

export function OfflineModal({ simulateOffline = false }: OfflineModalProps) {
  const online = useOnlineStatus();
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const offline = !online || simulateOffline;

  useEffect(() => {
    if (offline) buttonRef.current?.focus();else
    setStillOffline(false);
  }, [offline]);

  async function retry() {
    setChecking(true);
    setStillOffline(false);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setChecking(false);
    if (!navigator.onLine || simulateOffline) setStillOffline(true);
  }

  if (!offline || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-title"
        aria-describedby="offline-body"
        className="w-full max-w-[360px] rounded-[28px] bg-white px-6 pb-6 pt-8 text-center shadow-card">
        
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cream">
          <WifiOffIcon className="h-9 w-9 text-brand-ember" strokeWidth={2.2} aria-hidden="true" />
        </div>

        <h2 id="offline-title" className="mt-5 text-[22px] font-extrabold tracking-[-0.04em] text-ink">
          No internet connection
        </h2>
        <p id="offline-body" className="mt-2 text-[15px] leading-6 text-ink/60">
          LIBTRACK needs a connection to load books and your account. Check your Wi‑Fi or mobile data, then try again.
        </p>

        <p aria-live="polite" className="mt-3 min-h-[20px] text-[13px] font-semibold text-red-600 dark:text-red-400">
          {stillOffline ? 'Still offline. Please check your connection.' : ''}
        </p>

        <button
          ref={buttonRef}
          type="button"
          onClick={retry}
          disabled={checking}
          aria-busy={checking}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-ink text-base font-bold text-white outline-none active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40 disabled:bg-ink/70">
          
          {checking ? <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {checking ? 'Checking…' : 'Try again'}
        </button>
      </div>
    </div>,
    document.body
  );
}