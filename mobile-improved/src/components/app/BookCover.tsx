import React, { useEffect, useState } from 'react';
import { BookOpenIcon } from 'lucide-react';
import { API_ORIGIN } from '../../api/laravel';
import { cn } from '../../utils/cn';

interface BookCoverProps {
  /** The server-resolved `cover_image_url`; never a hand-built storage path. */
  src?: string | null;
  title: string;
  className?: string;
}

/** Turn the server's cover URL into one this WebView can load. */
export function resolveCoverUrl(src?: string | null): string | null {
  if (!src) return null;

  const value = String(src).trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const path = value.startsWith('/') ? value : `/${value}`;
  return `${API_ORIGIN}${path}`;
}

/**
 * A book cover, or a shelf-coloured placeholder when the library has not
 * uploaded artwork for the title. The URL is whatever `/books` returned — the
 * app must not reconstruct `storage/...` paths, because Laravel Cloud's bucket
 * is private and only `/book-covers/{file}` is public.
 */
export function BookCover({ src, title, className }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveCoverUrl(src);

  // A detail sheet reuses this component as the student opens another title,
  // so a broken image on the previous book must not blank the next cover.
  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-xl bg-cream text-brand-ember ring-1 ring-ink/10 dark:bg-brand-amber/10',
          className,
        )}>
        <BookOpenIcon className="h-5 w-5 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={`Cover of ${title}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('rounded-xl bg-cream object-cover ring-1 ring-ink/10', className)}
    />
  );
}
