import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { applyServerUrlChange } from '../../api/laravel';
import { DEFAULT_SERVER_URL, getServerUrl, isValidServerUrl, normalizeServerUrl, resetServerUrl, setServerUrl } from '../../api/serverConfig';

interface ServerUrlDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Temporary/local-testing server URL config. Remove this component and its
 * wiring when the app is fixed to the online server URL again.
 */
export function ServerUrlDialog({ open, onClose }: ServerUrlDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(getServerUrl());
    setError(null);
    setBusy(false);
  }, [open]);

  async function applyAndReload(previous: string, next: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (next !== previous) {
        await applyServerUrlChange();
      }
      window.location.reload();
    } catch {
      setBusy(false);
      setError('Could not apply the server URL. Try again.');
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeServerUrl(value);
    if (!isValidServerUrl(normalized)) {
      setError('Enter a valid URL, like http://homer:8000 or https://example.com');
      return;
    }
    const previous = getServerUrl();
    setServerUrl(normalized);
    await applyAndReload(previous, normalized);
  }

  async function handleReset() {
    const previous = getServerUrl();
    resetServerUrl();
    await applyAndReload(previous, DEFAULT_SERVER_URL);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Server URL"
            className="w-full max-w-md rounded-3xl bg-[#fffdf8] p-5 text-ink shadow-2xl ring-1 ring-black/10"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-ember/80">Local server</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-ink">Server URL</h2>
                <p className="mt-1 text-sm leading-5 text-ink/60">
                  Type the local server address. The app will reload and use this URL.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full p-2 text-ink/50 transition hover:bg-ink/5 hover:text-ink disabled:opacity-40"
                aria-label="Close">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSave}>
              <label className="block">
                <span className="text-sm font-semibold text-ink">URL</span>
                <input
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="http://homer:8000"
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/20"
                />
              </label>

              <p className="text-xs leading-5 text-ink/50">
                Default: <span className="break-all font-medium text-ink/70">{DEFAULT_SERVER_URL}</span>
              </p>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-ember px-4 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50">
                  {busy ? 'Saving...' : 'Save and reload'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleReset()}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-ink/[0.03] disabled:opacity-50">
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-ink/65 transition hover:bg-ink/[0.03] disabled:opacity-50 sm:mr-auto">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
