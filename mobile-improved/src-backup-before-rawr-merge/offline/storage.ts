const CACHE_PREFIX = 'libtrack:cache:v2:';
const LAST_USER_KEY = 'libtrack:last-user';
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type CacheEntry<T> = { savedAt: number; data: T };

export function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.savedAt !== 'number' || Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Storage is optional; the live request still succeeds when quota is full.
  }
}

export function rememberUser(user: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore unavailable storage
  }
}

export function readRememberedUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearOfflineData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith('libtrack:outbox:'));
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // ignore unavailable storage
  }
}
