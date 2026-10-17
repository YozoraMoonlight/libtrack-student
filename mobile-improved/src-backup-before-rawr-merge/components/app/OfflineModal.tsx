import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircleIcon, WifiOffIcon } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isApiOnline, retryRemoteData, subscribeConnection } from '../../offline/connection';

interface OfflineModalProps {
  simulateOffline?: boolean;
}

export function OfflineModal({ simulateOffline = false }: OfflineModalProps) {
  const browserOnline = useOnlineStatus();
  const [apiOnline, setApiOnlineState] = useState(isApiOnline());
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const offline = !browserOnline || !apiOnline || simulateOffline;

  useEffect(() => subscribeConnection(setApiOnlineState), []);
  useEffect(() => {
    if (!offline) setDismissed(false);
    if (offline && !dismissed) buttonRef.current?.focus();
    if (!offline) setStillOffline(false);
  }, [apiOnline, browserOnline, dismissed, offline, simulateOffline]);

  async function retry() {
    setChecking(true);
    setStillOffline(false);
    retryRemoteData();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setChecking(false);
    if (!navigator.onLine || !isApiOnline() || simulateOffline) setStillOffline(true);
  }

  if (!offline || typeof document === 'undefined') return null;

  if (dismissed) {
    return createPortal(
      <div className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-[430px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg">
        <WifiOffIcon className="h-4 w-4 shrink-0 text-brand-amber" aria-hidden="true" />
        <span className="flex-1">Offline mode · showing saved data</span>
        <button type="button" onClick={() => setDismissed(false)} className="text-xs font-bold text-brand-amber">Open</button>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
      <div role="alertdialog" aria-modal="true" aria-labelledby="offline-title" aria-describedby="offline-body" className="w-full max-w-[360px] rounded-[28px] bg-white px-6 pb-6 pt-8 text-center shadow-card">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cream"><WifiOffIcon className="h-9 w-9 text-brand-ember" strokeWidth={2.2} aria-hidden="true" /></div>
        <h2 id="offline-title" className="mt-5 text-[22px] font-extrabold tracking-[-0.04em] text-ink">You’re offline</h2>
        <p id="offline-body" className="mt-2 text-[15px] leading-6 text-ink/60">Your saved library data is still available. New requests will sync when your connection returns.</p>
        <p aria-live="polite" className="mt-3 min-h-[20px] text-[13px] font-semibold text-red-600 dark:text-red-400">{stillOffline ? 'Still offline. Please check your connection.' : ''}</p>
        <button ref={buttonRef} type="button" onClick={retry} disabled={checking} aria-busy={checking} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-ink text-base font-bold text-white outline-none active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40 disabled:bg-ink/70">
          {checking ? <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {checking ? 'Checking…' : 'Try again'}
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-ink/55">Continue with saved data</button>
      </div>
    </div>,
    document.body,
  );
}
