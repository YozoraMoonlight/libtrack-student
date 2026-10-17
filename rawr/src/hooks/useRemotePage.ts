import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, SessionExpiredError } from '../api/laravel';
import { setApiOnline, subscribeRetry } from '../offline/connection';
import { readCache, writeCache } from '../offline/storage';

type RemoteState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useRemotePage<T>(loader: () => Promise<T>, cacheKey?: string | null): RemoteState<T> {
  const loaderRef = useRef(loader);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  loaderRef.current = loader;

  useEffect(() => subscribeRetry(() => setRefreshKey((value) => value + 1)), []);

  useEffect(() => {
    let active = true;
    const cached = cacheKey ? readCache<T>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    loaderRef.current()
      .then((next) => {
        if (!active) return;
        setApiOnline(true);
        setData(next);
        setLoading(false);
        if (cacheKey) writeCache(cacheKey, next);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const serverResponded = reason instanceof ApiError || reason instanceof SessionExpiredError;
        setApiOnline(serverResponded);
        const message = reason instanceof SessionExpiredError
          ? reason.message
          : reason instanceof ApiError
            ? reason.message
            : 'Unable to reach LIBTRACK right now.';
        setError(cached ? `Showing saved data. ${message}` : message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  return { data, loading, error, refresh };
}
