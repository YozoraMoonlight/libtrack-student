import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, FileWarningIcon, Loader2Icon, MinusIcon, PlusIcon, RotateCwIcon } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

/**
 * Read a book's PDF inside the app.
 *
 * Pages are drawn onto a canvas (PDF.js), so there is no browser PDF viewer
 * with a Download or Print button. The server streams the file only to this
 * reader; everyday saving/printing is blocked, but screenshots cannot be.
 */

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
const FIT = 2; // 100%
const MAX_PAGE_WIDTH = 860;
const NEAR = '1200px 0px';

type Status = 'loading' | 'ready' | 'error';

export function PdfReader({ url, title }: { url: string; title: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const [ratio, setRatio] = useState(1.414);
  const [zoom, setZoom] = useState(FIT);
  const [space, setSpace] = useState(0);
  const [current, setCurrent] = useState(1);
  const [blockedHint, setBlockedHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    setStatus('loading');
    setDoc(null);

    (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

      task = pdfjs.getDocument({ url, withCredentials: true });
      const opened = await task.promise;
      if (cancelled) return;

      const first = await opened.getPage(1);
      const size = first.getViewport({ scale: 1 });
      if (cancelled) return;

      setRatio(size.height / size.width);
      setDoc(opened);
      setCurrent(1);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url, attempt]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setSpace(Math.max(0, el.clientWidth - 24));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // No saving or printing from the keyboard while the book is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's' || key === 'p') {
        e.preventDefault();
        setBlockedHint(true);
        window.setTimeout(() => setBlockedHint(false), 2500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pages = doc?.numPages ?? 0;
  const width = Math.round(Math.max(0, Math.min(space, MAX_PAGE_WIDTH)) * ZOOMS[zoom]);

  const goTo = (n: number) => {
    const page = Math.min(Math.max(1, n), pages);
    scroller.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: 'start' });
    setCurrent(page);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.07] px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={status !== 'ready' || current <= 1}
            onClick={() => goTo(current - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-20 text-center text-sm font-medium tabular-nums text-ink/70" aria-live="polite">
            {status === 'ready' ? `Page ${current} of ${pages}` : 'Page'}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={status !== 'ready' || current >= pages}
            onClick={() => goTo(current + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={status !== 'ready' || zoom === 0}
            onClick={() => setZoom((z) => z - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            <MinusIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={status !== 'ready'}
            onClick={() => setZoom(FIT)}
            aria-label="Fit the page to the reader"
            className="min-w-14 rounded-lg px-1 py-1 text-center text-sm font-medium tabular-nums text-ink/70 hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            {Math.round(ZOOMS[zoom] * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={status !== 'ready' || zoom === ZOOMS.length - 1}
            onClick={() => setZoom((z) => z + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {blockedHint ? (
        <p role="status" className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          This book can be read in LIBTRACK only. It can’t be saved or printed.
        </p>
      ) : null}

      <div
        ref={scroller}
        className="relative min-h-[60dvh] flex-1 overflow-auto bg-ink/[0.06] select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        role="document"
        aria-label={`${title}, PDF`}
      >
        {status === 'loading' && (
          <div className="flex h-full min-h-[40dvh] flex-col items-center justify-center gap-3 text-sm text-ink/60">
            <Loader2Icon className="h-7 w-7 animate-spin text-ink/30" aria-hidden="true" />
            Opening the PDF…
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-full min-h-[40dvh] flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
            <FileWarningIcon className="h-10 w-10 text-ink/30" aria-hidden="true" />
            <p className="max-w-[26ch] text-sm text-ink/70">The PDF couldn’t be opened. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              <RotateCwIcon className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && doc && width > 0 && (
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-3">
            {Array.from({ length: pages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} number={i + 1} width={width} ratio={ratio} root={scroller} onCurrent={setCurrent} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-ink/[0.07] px-3 py-2 text-[11px] text-ink/45">
        <BookOpenIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Read-only in LIBTRACK. Saving and printing are not available.</span>
      </div>
    </div>
  );
}

interface PageProps {
  doc: PDFDocumentProxy;
  number: number;
  width: number;
  ratio: number;
  root: React.RefObject<HTMLDivElement | null>;
  onCurrent: (n: number) => void;
}

function PdfPage({ doc, number, width, ratio, root, onCurrent }: PageProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(number <= 2);
  const [ownRatio, setOwnRatio] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const nearby = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root: root.current, rootMargin: NEAR });
    const middle = new IntersectionObserver(([e]) => e.isIntersecting && onCurrent(number), {
      root: root.current,
      rootMargin: '-50% 0px -50% 0px',
    });
    nearby.observe(el);
    middle.observe(el);
    return () => {
      nearby.disconnect();
      middle.disconnect();
    };
  }, [root, number, onCurrent]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;

    if (!near) {
      c.width = 0;
      c.height = 0;
      return;
    }

    let cancelled = false;
    let task: RenderTask | null = null;

    (async () => {
      const page = await doc.getPage(number);
      if (cancelled) return;

      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setOwnRatio(base.height / base.width);

      c.width = Math.floor(viewport.width * dpr);
      c.height = Math.floor(viewport.height * dpr);

      task = page.render({
        canvas: c,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      await task.promise;
    })().catch(() => {
      // A cancelled draw (scrolled away, zoomed) is expected.
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [near, width, doc, number]);

  const height = Math.round(width * (ownRatio ?? ratio));

  return (
    <div ref={box} data-page={number} className="relative shrink-0 bg-white shadow-sm ring-1 ring-black/5" style={{ width, height }}>
      <canvas ref={canvas} className="pointer-events-none block h-full w-full" aria-hidden="true" />
      <span className="sr-only">Page {number}</span>
    </div>
  );
}
