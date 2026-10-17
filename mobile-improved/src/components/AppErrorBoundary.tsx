/**
 * Makes crashes visible instead of black.
 *
 * This app is a WebView shell, and there is no browser chrome to fall back on:
 * when a render throws, React unmounts the whole tree and Android paints an
 * empty document, which reads as a black screen with nothing to go on. The same
 * is true for a rejected promise from a data poll, which never touches React at
 * all.
 *
 * Two layers, because the two failure modes need different tools:
 *
 *   AppErrorBoundary  - catches render/lifecycle throws so the rest of the tree
 *                       stays mounted and can report them.
 *   reportFatalError  - catches `window.onerror` and unhandled rejections and
 *                       paints straight into `document.body`, bypassing React
 *                       entirely. This is the one that still works after React
 *                       has already torn itself down.
 *
 * Both surfaces stay light-coloured on purpose. The whole point is to be
 * legible where the failure was previously a black rectangle.
 */

import React from 'react';

type Crash = { message: string; detail: string };

let fatal: Crash | null = null;

const listeners = new Set<(crash: Crash | null) => void>();

function publish(crash: Crash | null) {
  fatal = crash;
  listeners.forEach((listener) => listener(crash));
}

/** The most recent crash, for diagnostics. */
export function lastCrash(): Crash | null {
  return fatal;
}

function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n');
}

function describe(input: unknown): Crash {
  if (input instanceof Error) {
    return {
      message: input.message || input.name || 'Unknown error',
      detail: firstLines(input.stack || `${input.name}: ${input.message}`, 6),
    };
  }
  return { message: String(input), detail: '' };
}

/**
 * Paints a fatal error without React.
 *
 * Deliberately imperative: by the time a render has thrown there may be no
 * React tree left to render into, so this writes DOM nodes directly.
 */
export function reportFatalError(input: unknown, source = 'unknown'): void {
  const crash = describe(input);
  publish(crash);
  // Always reach the platform log, so `adb logcat` has it too.
  console.error(`[libtrack] fatal (${source}):`, input);

  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById('libtrack-fatal')) return;

  const host = document.createElement('div');
  host.id = 'libtrack-fatal';
  host.setAttribute('role', 'alert');
  host.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:#fdf6e8',
    'color:#1f1a17',
    'padding:24px',
    'overflow:auto',
    'font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
  ].join(';');

  const title = document.createElement('h1');
  title.textContent = 'The app hit an error';
  title.style.cssText = 'font:700 20px/1.3 system-ui,sans-serif;margin:0 0 4px';

  const sub = document.createElement('p');
  sub.textContent = `Source: ${source}`;
  sub.style.cssText = 'opacity:.6;margin:0 0 16px';

  const message = document.createElement('pre');
  message.textContent = crash.message;
  message.style.cssText =
    'white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e6d9bd;border-radius:12px;padding:12px;margin:0 0 12px';

  const detail = document.createElement('pre');
  detail.textContent = crash.detail;
  detail.style.cssText =
    'white-space:pre-wrap;word-break:break-word;opacity:.7;font-size:12px;margin:0 0 20px;max-height:40vh;overflow:auto';

  const button = document.createElement('button');
  button.textContent = 'Reload';
  button.style.cssText =
    'background:#1f1a17;color:#fff;border:0;border-radius:12px;padding:12px 20px;font:600 15px system-ui,sans-serif';
  button.onclick = () => window.location.reload();

  host.append(title, sub, message, detail, button);
  document.body.appendChild(host);
}

/**
 * Installs the async listeners. Idempotent, so calling it twice is harmless.
 *
 * `unhandledrejection` is the important one here: the data poll and the session
 * bootstrap both run as promises, and a rejection there produces no React error
 * and no visible symptom at all.
 */
export function installGlobalErrorHandlers(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    reportFatalError(event.error || event.message, 'window.onerror');
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportFatalError(event.reason, 'unhandledrejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  crash: Crash | null;
}

/** Catches render and lifecycle throws so the crash can be reported, not blanked. */
export class AppErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { crash: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { crash: describe(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    const crash = describe(error);
    publish(crash);
    console.error('[libtrack] render crash:', error, info.componentStack);
  }

  componentDidMount(): void {
    // A crash that arrived before this mounted still deserves a surface.
    listeners.add(this.onFatal);
    if (fatal) this.setState({ crash: fatal });
  }

  componentWillUnmount(): void {
    listeners.delete(this.onFatal);
  }

  private onFatal = (crash: Crash | null) => {
    if (crash) this.setState({ crash });
  };

  private retry = () => {
    publish(null);
    this.setState({ crash: null });
  };

  render(): React.ReactNode {
    const { crash } = this.state;
    if (!crash) return this.props.children;

    return (
      <div
        role="alert"
        className="fixed inset-0 z-[2147483647] overflow-auto bg-cream px-6 py-10 text-ink"
      >
        <h1 className="text-[20px] font-extrabold tracking-tight">The app hit an error</h1>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-ink/10 bg-white p-4 text-[13px]">
          {crash.message}
        </pre>
        {crash.detail ? (
          <pre className="mt-3 max-h-[40vh] overflow-auto whitespace-pre-wrap break-words text-[11px] text-ink/60">
            {crash.detail}
          </pre>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 rounded-xl bg-ink px-6 text-[15px] font-bold text-white"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={this.retry}
            className="h-12 rounded-xl px-6 text-[15px] font-semibold text-ink/60"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}