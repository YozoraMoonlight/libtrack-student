import React, { useEffect, useRef, useState } from 'react';
import { CameraIcon, LoaderCircleIcon, WifiOffIcon } from 'lucide-react';

interface QrScannerProps {
  onScan: (value: string) => void;
  onCancel: () => void;
}

export function QrScanner({ onScan, onCancel }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<{ stop: () => Promise<unknown> } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let active = true;
    let scanner: { stop: () => Promise<unknown>; start: (...args: unknown[]) => Promise<unknown> } | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!active) return;
        const nextScanner = new Html5Qrcode('mobile-qr-reader') as unknown as {
          stop: () => Promise<unknown>;
          start: (...args: unknown[]) => Promise<unknown>;
        };
        scanner = nextScanner;
        scannerRef.current = nextScanner;
        await nextScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (!active) return;
            onScanRef.current(decodedText);
            void nextScanner.stop().catch(() => undefined);
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
      void scanner?.stop().catch(() => undefined);
      scannerRef.current = null;
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
