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
 *
 * IMPORTANT: Android's cookie API is asymmetric and that asymmetry is the whole
 * difficulty here.
 *
 *   CookieManager.getCookie(url)   -> synchronous, reflects the jar right now
 *   CookieManager.setCookie(...)   -> asynchronous, commits later via callback
 *
 * CapacitorCookies.setCookie() resolves when the bridge call *returns*, not when
 * the cookie has actually been *stored*. Awaiting it and immediately firing the
 * bootstrap GET used to race, so the request went out without a session, landed
 * on the login page, and cost the user their sign-in. Writes are therefore
 * verified by polling the synchronous read back before the caller continues.
 */

import { Capacitor, CapacitorCookies, registerPlugin } from '@capacitor/core';

const STORAGE_KEY = 'libtrack:session-cookies:v1';

interface LibtrackCookiesPlugin {
  getCookieHeader(options: { url: string }): Promise<{ cookie: string }>;
  flush(): Promise<void>;
}

const LibtrackCookies = registerPlugin<LibtrackCookiesPlugin>('LibtrackCookies');

/** How long to wait for Android to actually commit the cookies we just wrote. */
const WRITE_SETTLE_TIMEOUT_MS = 1500;
const WRITE_POLL_INTERVAL_MS = 60;

/** Write-and-verify rounds before the restore is declared a failure. */
const RESTORE_ATTEMPTS = 3;

/** How long to wait for a background persist before the page may be frozen. */
const PERSIST_FLUSH_TIMEOUT_MS = 400;

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

/** Split a `Cookie:` header into name/value pairs. */
function parsePairs(cookie: string): Array<{ name: string; value: string }> {
  return cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const eq = part.indexOf('=');
      if (eq < 1) return [];
      return [{ name: part.slice(0, eq), value: part.slice(eq + 1) }];
    });
}

/**
 * Ask Android what it currently holds for the origin.
 *
 * This is the only call in the file whose result is guaranteed to be current,
 * so it is what every decision below is based on.
 */
async function currentJar(origin: string): Promise<string> {
  try {
    const { cookie } = await LibtrackCookies.getCookieHeader({ url: origin });
    return cookie || '';
  } catch {
    return '';
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Poll the jar until every expected cookie is actually readable.
 *
 * Returns the pairs that made it through, so the caller can tell whether the
 * restore really took rather than assuming it did.
 */
async function awaitWritten(
  origin: string,
  expected: Array<{ name: string; value: string }>,
  timeoutMs: number,
): Promise<{ ok: boolean; jar: string }> {
  const deadline = Date.now() + timeoutMs;
  let jar = '';

  // Always check once, even when there is nothing to wait for.
  for (;;) {
    jar = await currentJar(origin);
    const present = new Set(parsePairs(jar).map((pair) => `${pair.name}=${pair.value}`));
    const landed = expected.every((pair) => present.has(`${pair.name}=${pair.value}`));
    if (landed || Date.now() >= deadline) {
      return { ok: landed, jar };
    }
    await wait(WRITE_POLL_INTERVAL_MS);
  }
}

/**
 * Names only, never values.
 *
 * Session cookies are credentials. Enough to diagnose "the snapshot was empty"
 * or "the jar never had the cookie" without putting a live session in the log.
 */
function cookieNames(cookie: string): string {
  return parsePairs(cookie).map((pair) => pair.name).join(',') || '(none)';
}

/** Snapshot the session cookie so it can be restored after a cold start. */
export async function persistSessionCookies(origin: string): Promise<void> {
  if (!isNativeBuild() || !origin) return;

  try {
    const jar = await currentJar(origin);
    // A session id plus the CSRF companion is all we need.
    const usable = parsePairs(jar)
      .map((pair) => `${pair.name}=${pair.value}`)
      .join('; ');

    // Never overwrite a good snapshot with nothing. The jar is read
    // synchronously but this runs at background time, where a transient empty
    // read is far more likely to be a race than a real sign-out. Signing out
    // clears the snapshot explicitly, so an empty read carries no information
    // worth acting on and dropping it would only risk losing a live session.
    if (!usable && read()) {
      console.log('[libtrack:session] persist skipped, jar empty but snapshot exists');
      return;
    }

    write(usable);
    console.log(`[libtrack:session] persisted [${cookieNames(jar)}]`);
    // Ask Android to write its jar to disk while we are here.
    await LibtrackCookies.flush();
  } catch (error) {
    // If the cookie cannot be read the session simply will not persist.
    console.warn('[libtrack:session] persist failed', error);
  }
}

/** True when every snapshot cookie is already in the jar with the same value. */
function isInstalled(jar: string, expected: Array<{ name: string; value: string }>): boolean {
  if (!expected.length) return false;
  const present = new Set(parsePairs(jar).map((pair) => `${pair.name}=${pair.value}`));
  return expected.every((pair) => present.has(`${pair.name}=${pair.value}`));
}

/**
 * Put the saved cookie back before the first request on a cold start.
 *
 * Deliberately does not delete anything. Capacitor 8's deleteCookie takes no
 * `path` and, like setCookie, resolves before Android commits, so a delete can
 * land *after* the write and leave the jar with nothing at all. Android usually
 * restores the session from its own on-disk copy anyway, and destroying that
 * only to rebuild it by hand is how a working session gets thrown away.
 *
 * So this is verify-first: if the jar already holds the snapshot, nothing is
 * mutated. Only when it is genuinely missing are the values written, and they
 * are then confirmed by polling the synchronous read.
 */
export async function restoreSessionCookies(origin: string): Promise<boolean> {
  if (!isNativeBuild() || !origin) return false;

  const pairs = parsePairs(read());
  if (!pairs.length) {
    console.log('[libtrack:session] restore skipped, no snapshot saved');
    return false;
  }

  try {
    // The happy path: Android brought the session back itself. Leave it be.
    const jar = await currentJar(origin);
    if (isInstalled(jar, pairs)) {
      console.log(`[libtrack:session] restore ok, already in jar [${cookieNames(jar)}]`);
      await LibtrackCookies.flush();
      return true;
    }

    console.log(
      `[libtrack:session] restoring [${pairs.map((pair) => pair.name).join(',')}] into empty jar [${cookieNames(jar)}]`,
    );

    for (let attempt = 0; attempt < RESTORE_ATTEMPTS; attempt += 1) {
      for (const pair of pairs) {
        await CapacitorCookies.setCookie({
          url: origin,
          key: pair.name,
          value: pair.value,
          path: '/',
        });
      }

      const { ok, jar: after } = await awaitWritten(origin, pairs, WRITE_SETTLE_TIMEOUT_MS);
      await LibtrackCookies.flush();
      if (ok) {
        console.log(`[libtrack:session] restore ok on attempt ${attempt + 1} [${cookieNames(after)}]`);
        return true;
      }
      console.warn(
        `[libtrack:session] restore attempt ${attempt + 1} did not stick, jar now [${cookieNames(after)}]`,
      );
    }

    return false;
  } catch (error) {
    console.warn('[libtrack:session] restore failed', error);
    return false;
  }
}

/** True when a snapshot is on hand, without exposing its contents. */
export function hasSavedSession(): boolean {
  return parsePairs(read()).length > 0;
}

/**
 * Snapshot the cookie whenever the app is backgrounded.
 *
 * Android can freeze or kill a backgrounded WebView at any moment, so the save
 * has to happen on the way out, not only at login. `visibilitychange` is used
 * because it needs no extra plugin.
 *
 * If the page is on its way to being frozen the platform will not wait for an
 * async plugin round-trip, so the write to localStorage happens first and the
 * flush is allowed to be cut short.
 */
export function watchForBackgroundPersist(
  origin: string,
  onPersist: () => Promise<void> = () => persistSessionCookies(origin),
): () => void {
  if (!isNativeBuild() || typeof document === 'undefined') return () => {};

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') return;
    void Promise.race([
      onPersist(),
      wait(PERSIST_FLUSH_TIMEOUT_MS).then(() => undefined),
    ]);
  };

  // `pagehide` covers the WebView being torn down without a visibility change.
  const onPageHide = () => {
    void onPersist();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
  };
}

/** Forget the snapshot, used on sign-out. */
export function clearSavedSessionCookies(): void {
  write('');
}