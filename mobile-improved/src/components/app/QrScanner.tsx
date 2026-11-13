import React, { useEffect, useRef, useState } from 'react';
import { CameraIcon, LoaderCircleIcon, WifiOffIcon } from 'lucide-react';

interface QrScannerProps {
  onScan: (value: string) => void;
  onCancel: () => void;
}

/** The slice of html5-qrcode's Html5Qrcode that this component drives. */
type ScannerHandle = {
  start: (...args: unknown[]) => Promise<unknown>;
  stop: () => Promise<unknown>;
};

export function QrScanner({ onScan, onCancel }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let active = true;
    let stopped = false;
    let scanner: ScannerHandle | null = null;

    /**
     * html5-qrcode's stop() throws a plain string *synchronously* when the
     * scanner is not in the SCANNING state, and a `.catch()` cannot intercept
     * a synchronous throw. Two things make that common:
     *
     *   - the decode callback stops the camera, then unmounting stops it again
     *   - closing the sheet before the camera finishes starting leaves the
     *     scanner in NOT_STARTED, where stop() throws immediately
     *
     * Either way the throw escapes an effect cleanup, React treats it as a
     * fatal render error, and the app-wide error boundary replaces the UI.
     * Stop at most once, and swallow the throw.
     */
    async function stopOnce(target: ScannerHandle | null) {
      if (!target || stopped) return;
      stopped = true;
      try {
        await target.stop();
      } catch {
        // Already stopped, or start() never reached the SCANNING state.
      }
    }

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!active) return;
        const nextScanner = new Html5Qrcode('mobile-qr-reader') as unknown as ScannerHandle;
        scanner = nextScanner;
        await nextScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (!active) return;
            onScanRef.current(decodedText);
            void stopOnce(nextScanner);
          },
          () => undefined,
        );
        if (active) setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
          setError('Camera access is unavailable. Enter the QR payload manually instead.');
        }
      }
    }

    void start();
    return () => {
      active = false;
      void stopOnce(scanner);
    };
  }, []);

  return (
    <div className="pt-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <div id="mobile-qr-reader" className="min-h-[280px] w-full" />
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            <LoaderCircleIcon className="h-7 w-7 animate-spin" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-3 flex items-start gap-2 text-sm text-red-600"><WifiOffIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p> : null}
      <button type="button" onClick={onCancel} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink/10 text-sm font-semibold text-ink/70">
        <CameraIcon className="h-4 w-4" aria-hidden="true" />
        Enter code manually
      </button>
    </div>
  );
}
