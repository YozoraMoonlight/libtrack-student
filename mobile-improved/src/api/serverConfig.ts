/**
 * Runtime-configurable server URL (temporary/local testing feature).
 *
 * Lets the app point at a local/LAN Laravel server without rebuilding.
 * Stored on-device; defaults to the build-time production origin.
 * Remove this module and its UI when switching back to a fixed online URL.
 */

const STORAGE_KEY = 'libtrack:server-url';

const BUILD_DEFAULT = String(import.meta.env.VITE_API_ORIGIN || 'https://libtrack-production-0ujp7e.laravel.cloud')
  .trim()
  .replace(/\/+$/, '');

export const DEFAULT_SERVER_URL = BUILD_DEFAULT;

export function normalizeServerUrl(value: string): string {
  let url = value.trim();
  if (!url) return '';
  // Allow users to type "homer:8000" or "192.168.1.5:8000".
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

export function isValidServerUrl(value: string): boolean {
  const normalized = normalizeServerUrl(value);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function getServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isValidServerUrl(saved)) return normalizeServerUrl(saved);
  } catch {
    // Ignore storage failures; fall back to build default.
  }
  return DEFAULT_SERVER_URL;
}

export function setServerUrl(value: string): string {
  const normalized = normalizeServerUrl(value);
  if (!isValidServerUrl(normalized)) {
    throw new Error('Enter a valid URL, like http://homer:8000 or https://example.com');
  }
  try {
    if (normalized === DEFAULT_SERVER_URL) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  } catch {
    // Best effort; the in-memory caller still gets the normalized URL.
  }
  return normalized;
}

export function resetServerUrl(): string {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  return DEFAULT_SERVER_URL;
}

export function hasCustomServerUrl(): boolean {
  return getServerUrl() !== DEFAULT_SERVER_URL;
}
