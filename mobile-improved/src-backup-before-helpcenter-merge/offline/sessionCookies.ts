/**
 * Keeps the Laravel session alive across app restarts.
 *
 * Why this is needed: inside the APK, requests are proxied through the WebView
 * and executed by Capacitor's native layer, which stores `Set-Cookie` in
 * Android's `webkit.CookieManager`. That jar is never flushed to disk by the
 * proxy path, so close the app and the session is gone and you get bounced to
 * the login screen.
 *
 * Browsers persist cookies for us, so all of this is a no-op outside a native
 * build. On device the flow is a plain save/restore:
 *
 *   save    - read the cookie header Android holds for the LIBTRACK origin
 *   restore - write it back and flush, before the first request goes out
 *
 * The read has to go through our own `LibtrackCookies` plugin. Capacitor's
 * CapacitorCookies.getCookies() ignores its `url` option and evaluates
 * `document.cookie` in the WebView, which only ever sees https://localhost and
 * therefore reports nothing for the LIBTRACK host.
 */

import { Capacitor, CapacitorCookies, registerPlugin } from '@capacitor/core';

const STORAGE_KEY = 'libtrack:session-cookies:v1';

interface LibtrackCookiesPlugin {
  getCookieHeader(options: { url: string }): Promise<{ cookie: string }>;
  flush(): Promise<void>;
}

const LibtrackCookies = registerPlugin<LibtrackCookiesPlugin>('LibtrackCookies');

function isNativeBuild(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function read(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function write(cookie: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (cookie) window.localStorage.setItem(STORAGE_KEY, cookie);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is optional; the worst case is being asked to sign in again.
  }
}

/** Snapshot the session cookie so it can be restored after a cold start. */
export async function persistSessionCookies(origin: string): Promise<void> {
  if (!isNativeBuild() || !origin) return;

  try {
    const { cookie } = await LibtrackCookies.getCookieHeader({ url: origin });
    // A session id plus the CSRF companion is all we need.
    const usable = (cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('; ');

    write(usable);
    // Ask Android to write its jar to disk while we are here.
    await LibtrackCookies.flush();
  } catch {
    // If the cookie cannot be read the session simply will not persist.
  }
}

/** Put the saved cookie back before the first request on a cold start. */
export async function restoreSessionCookies(origin: string): Promise<boolean> {
  if (!isNativeBuild() || !origin) return false;

  const saved = read();
  if (!saved) return false;

  try {
    for (const part of saved.split(';')) {
      const pair = part.trim();
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq < 1) continue;

      await CapacitorCookies.setCookie({
        url: origin,
        key: pair.slice(0, eq),
        value: pair.slice(eq + 1),
        path: '/',
      });
    }

    await LibtrackCookies.flush();
    return true;
  } catch {
    return false;
  }
}

/** Forget the snapshot, used on sign-out. */
export function clearSavedSessionCookies(): void {
  write('');
}
