import { setApiOnline } from '../offline/connection';
import {
  clearSavedSessionCookies,
  hasSavedSession,
  persistSessionCookies,
  restoreSessionCookies,
  watchForBackgroundPersist,
} from '../offline/sessionCookies';

const DEFAULT_ORIGIN = '';

/** Upper bound on the sign-in self-heal, so a slow restore cannot pin the UI. */
const RECOVERY_TIMEOUT_MS = 4000;

/** Write-and-verify rounds before a cold-start recovery is declared a failure. */
const RECOVERY_ATTEMPTS = 3;

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  url: string;

  constructor(message: string, status = 0, errors: Record<string, string[]> = {}, url = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.url = url;
  }
}

export class SessionExpiredError extends ApiError {
  constructor(url = '') {
    super('Your LIBTRACK session has expired. Please sign in again.', 401, {}, url);
    this.name = 'SessionExpiredError';
  }
}

export function isConnectionError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status === 0);
}

export type InertiaPage<T = Record<string, unknown>> = {
  component: string;
  props: T;
  url: string;
  version: string;
};

export type StudentUser = {
  id?: number;
  name: string;
  email: string;
  student_id?: string | null;
  lrn?: string | null;
  school_id?: number | null;
  school_name?: string | null;
  /** Newer accounts split the name; older ones only have `name`. */
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  /** Replaces the old `department` column. */
  academic_strand?: string | null;
  phone?: string | null;
  qr_code?: string | null;
  user_role?: string | null;
  is_active?: boolean | null;
  [key: string]: unknown;
};

export type DashboardStats = {
  activeBorrows: number;
  totalBorrowed: number;
  unpaidFines: number;
};

export type LiveTransaction = {
  id: number | string;
  status?: string;
  borrowed_at?: string | null;
  due_date?: string | null;
  returned_at?: string | null;
  book?: { title?: string | null; author?: string | null } | null;
  fines?: Array<{ amount?: number | string | null }> | null;
  [key: string]: unknown;
};

export type DashboardProps = {
  user: StudentUser;
  qrCode: string;
  qrMime?: string;
  stats: DashboardStats;
  upcomingDue: LiveTransaction[];
  recentActivity: LiveTransaction[];
  auth?: { user?: StudentUser | null };
};

export type Paginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  [key: string]: unknown;
};

export type LiveBook = {
  id: number | string;
  title?: string | null;
  author?: string | null;
  isbn?: string | null;
  location?: string | null;
  total_copies?: number | null;
  available_copies?: number | null;
  status?: string | null;
  cover_image?: string | null;
  /** Resolved by the server through the /book-covers route. Never rebuild it. */
  cover_image_url?: string | null;
  has_pdf?: boolean | null;
  pdf_url?: string | null;
  pdf_size?: number | null;
  category?: { id?: number; name?: string | null } | null;
  [key: string]: unknown;
};

export type BookStates = {
  cart?: Array<number | string>;
  reserved?: Array<number | string>;
  borrowed?: Array<number | string>;
};

export type BooksProps = {
  books: Paginated<LiveBook>;
  categories: Array<{ id: number | string; name: string }>;
  filters?: { search?: string | null; category_id?: string | null; status?: string | null };
  /** Which titles are in the cart, set aside, or already borrowed. */
  bookStates?: BookStates;
};

export type LiveBorrowing = {
  id: number | string;
  status?: string | null;
  borrowed_at?: string | null;
  due_date?: string | null;
  returned_at?: string | null;
  return_requested_at?: string | null;
  return_requested_method?: string | null;
  book?: LiveBook | null;
  fines?: Array<{ amount?: number | string | null; paid_amount?: number | string | null }> | null;
  [key: string]: unknown;
};

export type ActiveLoan = {
  id: number | string;
  book_title?: string | null;
  book_author?: string | null;
  accession_number?: string | null;
  borrowed_at?: string | null;
  due_date?: string | null;
  status?: string | null;
  return_requested_at?: string | null;
  return_request_method?: string | null;
};

export type BorrowingsProps = {
  borrowings: Paginated<LiveBorrowing>;
  activeLoans: ActiveLoan[];
};

export type LiveFine = {
  id: number | string;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  type?: string | null;
  description?: string | null;
  created_at?: string | null;
  transaction?: { book?: LiveBook | null } | null;
  [key: string]: unknown;
};

/* ------------------------------------------------------------ notifications */

export type LiveNotification = {
  id: number | string;
  /** New feed field (`account.disabled`, `borrow_request.released`, ...) */
  kind?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  channel?: string | null;
  tone?: string | null;
  actor?: string | null;
  /** New feed field: the server's read flag. */
  read?: boolean | null;
  is_read?: boolean | number | null;
  read_at?: string | null;
  popped_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SystemRelease = {
  version: string;
  date: string;
  title: string;
  changes: Array<{ type: string; text: string }>;
};

export type NotificationFeed = {
  account: { active: boolean; message?: string | null };
  unread_count: number;
  items: LiveNotification[];
  has_more: boolean;
  page: number;
  /** Notifications the server handed out exactly once for the owl to announce. */
  popups: LiveNotification[];
  updates: {
    latest: { version: string; date: string; title: string } | null;
    unseen: boolean;
  } | null;
};

/** The feed is served either as a bare list or wrapped in `notifications`/`data`. */
function notificationList(body: unknown): LiveNotification[] {
  if (Array.isArray(body)) return body as LiveNotification[];
  if (typeof body !== 'object' || body === null) return [];

  const record = body as Record<string, unknown>;
  for (const key of ['notifications', 'data', 'feed', 'items']) {
    const value = record[key];
    if (Array.isArray(value)) return value as LiveNotification[];
    if (typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)) {
      return (value as { data: LiveNotification[] }).data;
    }
  }
  return [];
}

export async function getNotificationFeed(page = 1): Promise<NotificationFeed> {
  const query = page > 1 ? `?page=${page}` : '';
  const body = await request<unknown>(`/notifications/feed${query}`, {
    headers: { Accept: 'application/json' },
  });

  if (Array.isArray(body)) {
    return {
      account: { active: true },
      unread_count: 0,
      items: body as LiveNotification[],
      has_more: false,
      page,
      popups: [],
      updates: null,
    };
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const account = record.account as { active?: boolean; message?: string | null } | undefined;
  const updates = record.updates as NotificationFeed['updates'];

  return {
    account: { active: account?.active !== false, message: account?.message ?? null },
    unread_count: Number(record.unread_count ?? 0),
    items: notificationList(record),
    has_more: Boolean(record.has_more),
    page: Number(record.page ?? page),
    popups: Array.isArray(record.popups) ? (record.popups as LiveNotification[]) : [],
    updates: updates ?? null,
  };
}

/** Kept for callers that only need the list. */
export async function getNotifications(): Promise<LiveNotification[]> {
  return (await getNotificationFeed()).items;
}

export async function markNotificationRead(notificationId: number | string): Promise<void> {
  await request(`/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function getSystemUpdates(): Promise<{ releases: SystemRelease[]; seen: string | null }> {
  const body = await request<{ releases?: SystemRelease[]; seen?: string | null }>('/system-updates', {
    headers: { Accept: 'application/json' },
  });
  return { releases: Array.isArray(body?.releases) ? body.releases : [], seen: body?.seen ?? null };
}

/** Opening What's New clears the server-side unread dot. */
export async function markSystemUpdatesSeen(): Promise<void> {
  await request('/system-updates/seen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

/** Fired locally so the account menu can clear its dot without a re-fetch. */
export const SYSTEM_UPDATES_SEEN_EVENT = 'libtrack:system-updates-seen';

/* -------------------------------------------------------- forgot password */

export type ForgotPasswordPending = {
  phone_masked?: string | null;
  expires_at?: string | null;
  otp_id?: number | string | null;
  identifier?: string | null;
  resend_in?: number | null;
  [key: string]: unknown;
};

function pendingFrom(body: unknown): ForgotPasswordPending | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;

  if (record.pending && typeof record.pending === 'object') return record.pending as ForgotPasswordPending;
  if (record.phone_masked || record.expires_at || record.otp_id) return record as ForgotPasswordPending;
  return null;
}

export async function getForgotPasswordPage(): Promise<ForgotPasswordPending | null> {
  const page = await inertiaPage<{ pending?: ForgotPasswordPending | null }>('/forgot-password');
  return page.props?.pending ?? null;
}

/** Starts the reset. Returns the pending record on success. */
export async function requestPasswordReset(identifier: string): Promise<ForgotPasswordPending | null> {
  const body = await request<unknown>('/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formBody({ identifier }),
  });

  const pending = pendingFrom(body);
  if (pending) return pending;

  // Inertia endpoints answer with a redirect, so re-read the page for state.
  return getForgotPasswordPage();
}

export async function resendPasswordResetCode(): Promise<ForgotPasswordPending | null> {
  const body = await request<unknown>('/forgot-password/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formBody({}),
  });

  const pending = pendingFrom(body);
  if (pending) return pending;
  return getForgotPasswordPage();
}

export async function resetPassword(values: {
  code: string;
  password: string;
  password_confirmation: string;
  portal?: string;
}): Promise<void> {
  await request('/forgot-password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formBody({
      code: values.code,
      password: values.password,
      password_confirmation: values.password_confirmation,
      portal: values.portal ?? 'student',
    }),
  });
}

export async function cancelPasswordReset(): Promise<void> {
  await request('/forgot-password/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formBody({}),
  });
}

export type FinesProps = {
  fines: Paginated<LiveFine>;
  totalUnpaid: number;
};

type SessionState = {
  csrfToken: string | null;
  inertiaVersion: string | null;
};

let session: SessionState = {
  csrfToken: null,
  inertiaVersion: null,
};
let bootstrapPromise: Promise<SessionState> | null = null;

function url(path: string): string {
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function extractCsrfToken(html: string): string | null {
  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null;
  }

  return html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
}

function extractInertiaPage<T>(html: string): InertiaPage<T> | null {
  if (typeof DOMParser === 'undefined') return null;

  const document = new DOMParser().parseFromString(html, 'text/html');
  const encodedPage = document.querySelector('#app')?.getAttribute('data-page');

  if (!encodedPage) return null;

  try {
    return JSON.parse(encodedPage) as InertiaPage<T>;
  } catch {
    return null;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!text) return null;
  if (contentType.includes('application/json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

function errorsFromBody(body: unknown): Record<string, string[]> {
  if (typeof body !== 'object' || body === null || !('errors' in body)) return {};

  const errors = (body as { errors: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) return {};

  return Object.fromEntries(
    Object.entries(errors as Record<string, unknown>)
      .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]])
  );
}

function messageFromBody(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null) {
    const record = body as { message?: unknown; reason?: unknown; error?: unknown };
    if (typeof record.message === 'string' && record.message) return record.message;
    if (typeof record.reason === 'string' && record.reason) return record.reason;
    // The cart QR lookup answers 422 with `{ error: "…" }`.
    if (typeof record.error === 'string' && record.error) return record.error;
  }

  return fallback;
}

async function fetchWithStatus(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    setApiOnline(true);
    return response;
  } catch (error: unknown) {
    setApiOnline(false);
    throw error;
  }
}

/**
 * Actually asks the server whether we are reachable.
 *
 * `navigator.onLine` is not trustworthy inside an Android WebView: it can sit at
 * `false` after a dropout and the `online` event may never fire, which used to
 * leave the offline gate stuck open with no way out. A real request is the only
 * trustworthy signal, so the retry button uses this.
 */
export async function probeConnection(): Promise<boolean> {
  try {
    const response = await fetch(url(`/mobile/login?_ping=${Date.now()}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/html, application/xhtml+xml', 'X-Requested-With': 'XMLHttpRequest' },
    });

    // Any HTTP answer means the network is working, even a redirect.
    setApiOnline(true);
    return response.status > 0;
  } catch {
    setApiOnline(false);
    return false;
  }
}

async function establishSession(): Promise<SessionState> {
  const response = await fetchWithStatus(url('/mobile/login'), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'text/html, application/xhtml+xml',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new ApiError('Unable to reach the LIBTRACK server.', response.status, {}, response.url);
  }

  const html = await response.text();
  const csrfToken = extractCsrfToken(html);
  const page = extractInertiaPage(html);

  if (!csrfToken) {
    throw new ApiError('The LIBTRACK server did not return a CSRF token.', response.status, {}, response.url);
  }

  session = {
    csrfToken,
    inertiaVersion: page?.version ?? null,
  };

  return session;
}

function clearSessionCache(): void {
  session = { csrfToken: null, inertiaVersion: null };
  bootstrapPromise = null;
}

/**
 * One cold-start attempt at getting a working session back.
 *
 * Ordering matters. The native cookie jar has to be rebuilt *before* the
 * bootstrap GET goes out, and the restore is only trusted once Android reports
 * the cookies back, because `setCookie` resolves before it commits.
 */
async function bootSession(): Promise<SessionState> {
  await restoreSessionCookies(API_ORIGIN);
  return establishSession();
}

/**
 * True when a saved session is waiting to be restored.
 *
 * Drives the cold-start screen choice. Synchronous by design: the UI needs to
 * know this on its very first render, before any request has been made, and
 * localStorage is already populated by then.
 */
export function hasSavedSessionCookie(): boolean {
  return hasSavedSession();
}

export function ensureLaravelSession(): Promise<SessionState> {
  if (session.csrfToken) return Promise.resolve(session);
  if (!bootstrapPromise) {
    bootstrapPromise = bootSession().catch((error: unknown) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

/**
 * Second chance for a session that looked dead.
 *
 * A restore can land in the jar imperfectly, or Android can keep a stale copy
 * that shadows the one we just wrote. Rebuilding the jar from the snapshot and
 * re-running the bootstrap costs one extra round trip and, when it works, saves
 * the user a sign-in. Returns false when there is nothing left to try, or the
 * snapshot itself is what the server has forgotten.
 */
export async function recoverExpiredSession(): Promise<boolean> {
  if (!hasSavedSession()) return false;

  clearSessionCache();

  // No cookie deletion here. The snapshot is rewritten in place and re-checked,
  // because deleting is the one operation that cannot be trusted: it resolves
  // before Android commits, so it can erase a session that was working.
  for (let attempt = 0; attempt < RECOVERY_ATTEMPTS; attempt += 1) {
    if (!(await restoreSessionCookies(API_ORIGIN))) continue;

    try {
      // Hard bound. This runs inside the sign-in path, so a slow restore must
      // degrade into an ordinary "please sign in again" rather than leaving the
      // user watching a spinner that never resolves.
      await withTimeout(establishSession(), RECOVERY_TIMEOUT_MS);
      return true;
    } catch {
      clearSessionCache();
    }
  }

  return false;
}

/** Reject rather than hang, so a stalled request cannot pin the UI. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('session recovery timed out')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('session recovery failed'));
      },
    );
  });
}

/**
 * Keep the snapshot current while the app is running.
 *
 * Android can freeze or kill a backgrounded WebView without warning, and a
 * session cookie that was never snapshotted is a session lost. Returns a
 * teardown function for hot reload.
 */
export function watchSessionPersistence(): () => void {
  return watchForBackgroundPersist(API_ORIGIN);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await ensureLaravelSession();
    const headers = new Headers(init.headers);
    headers.set('Accept', headers.get('Accept') || 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');
    if (current.csrfToken && !headers.has('X-CSRF-TOKEN')) {
      headers.set('X-CSRF-TOKEN', current.csrfToken);
    }

    const response = await fetchWithStatus(url(path), {
      ...init,
      headers,
      credentials: 'include',
    });
    const body = await readResponseBody(response);

    // Laravel regenerates the session after login. Refresh the CSRF token once
    // and replay the mutation instead of surfacing a stale-token 419.
    if (response.status === 419 && attempt === 0) {
      clearSessionCache();
      continue;
    }

    if (response.status === 401 || landedOnLogin(response, path)) {
      throw new SessionExpiredError(response.url);
    }

    if (!response.ok) {
      throw new ApiError(
        messageFromBody(body, 'The LIBTRACK request failed.'),
        response.status,
        errorsFromBody(body),
        response.url,
      );
    }

    return body as T;
  }

  throw new ApiError('The LIBTRACK request could not be completed.', 419, {}, url(path));
}

export async function loginWithLaravel(identifier: string, password: string): Promise<void> {
  await ensureLaravelSession();
  const form = new URLSearchParams({ email: identifier, password });

  try {
    await request('/mobile/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) throw error;
    throw new ApiError('Those credentials do not match our records.', 422);
  }

  // The mobile controller redirects to /dashboard after a successful login.
  // The next Inertia read verifies the session instead of trusting the redirect.
  try {
    await inertiaPage('/student/dashboard');
  } catch (error) {
    // Bouncing back to the login page means the credentials were rejected.
    if (error instanceof SessionExpiredError) {
      throw new ApiError('Those credentials do not match our records.', 422);
    }
    throw error;
  }

  // Snapshot the session cookie so the next cold start can restore it.
  await persistSessionCookies(API_ORIGIN);
}

/**
 * True when a request meant for app data actually ended up on a login page.
 *
 * `fetch` follows redirects transparently, so a signed-out read lands on the
 * login screen with a 200 and a perfectly valid Inertia payload. Checking the
 * final URL is what stops that being parsed as dashboard data. We deliberately
 * do not rely on `response.redirected`: Capacitor's native HTTP bridge does not
 * always set it.
 */
function landedOnLogin(response: Response, requestedPath: string): boolean {
  if (requestedPath.startsWith('/mobile/login') || requestedPath.startsWith('/mobile/register')) return false;

  const location = response.headers.get('location');
  if (location && location.includes('/login')) return true;

  const finalUrl = typeof response.url === 'string' ? response.url : '';
  return Boolean(finalUrl) && finalUrl.includes('/login');
}

export async function inertiaPage<T = Record<string, unknown>>(
  path: string,
  versionAttempt = 0,
  /** Prop keys this endpoint must return for the payload to be usable. */
  expect: string[] = [],
): Promise<InertiaPage<T>> {
  const current = await ensureLaravelSession();
  const headers = new Headers({
    Accept: 'text/html, application/xhtml+xml',
    'X-Inertia': 'true',
    'X-Requested-With': 'XMLHttpRequest',
  });

  if (current.inertiaVersion) headers.set('X-Inertia-Version', current.inertiaVersion);

  const response = await fetchWithStatus(url(path), {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  // Inertia answers 409 both for a stale asset version and for a redirect it
  // wants treated as a full page load. Re-bootstrap once, then give up instead
  // of recursing forever when the session cannot be established.
  if (response.status === 409 || response.status === 412) {
    if (versionAttempt === 0) {
      clearSessionCache();
      await ensureLaravelSession();
      return inertiaPage<T>(path, 1, expect);
    }
    throw new ApiError('The LIBTRACK session could not be refreshed. Please sign in again.', response.status, {}, response.url);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (response.status === 401 || landedOnLogin(response, path)) {
    throw new SessionExpiredError(response.url);
  }

  if (!response.ok) {
    throw new ApiError(
      messageFromBody(body, 'The LIBTRACK page request failed.'),
      response.status,
      errorsFromBody(body),
      response.url,
    );
  }

  const page = contentType.includes('application/json')
    ? (body as InertiaPage<T>)
    : extractInertiaPage<T>(body as string);

  if (!page) throw new ApiError('The LIBTRACK server returned an unexpected page.', response.status, {}, response.url);

  // Shape check, which is what actually catches a dead session.
  //
  // A signed-out read lands on the login screen and comes back as a perfectly
  // valid Inertia page: 200, correct envelope, props and all. The only reliable
  // evidence is that the props are for a different screen, but `response.url` is
  // not dependable under Capacitor's native HTTP bridge, so the redirect can slip
  // through `landedOnLogin` and be handed back as if it were data. Callers then
  // dereference props that were never there.
  if (expect.length) {
    const props = page.props as Record<string, unknown> | undefined;
    const missing = expect.filter((key) => !props || props[key] === undefined || props[key] === null);
    if (missing.length) {
      throw new SessionExpiredError(response.url || path);
    }
  }

  return page;
}

/**
 * Record `/path` as Laravel's "previous URL".
 *
 * `back()` is what the cart and settings controllers use to send their flash
 * message after a write. Laravel only remembers the previous URL for a
 * non-AJAX GET, and every read this app makes is marked as AJAX, so without
 * this priming the redirect would point at the login page and the message
 * would be thrown away.
 *
 * Deliberately no `X-Requested-With`: that is the flag Laravel checks.
 */
async function primePreviousUrl(path: string): Promise<void> {
  try {
    const current = await ensureLaravelSession();
    const headers = new Headers({
      Accept: 'text/html, application/xhtml+xml',
      'X-Inertia': 'true',
    });
    if (current.inertiaVersion) headers.set('X-Inertia-Version', current.inertiaVersion);
    await fetchWithStatus(url(path), { method: 'GET', headers, credentials: 'include' });
  } catch {
    // The write can still succeed; only its flash message would be lost.
  }
}

export type InertiaVisitOptions = {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Form fields (default) or a JSON object when `json` is true. */
  data?: Record<string, string | number | boolean | null | undefined>;
  json?: boolean;
  /** The app page the controller should return to, e.g. `/borrow-cart`. */
  referrer?: string;
};

/**
 * Submit an Inertia write (add to cart, submit request, save profile).
 *
 * Returns the page the controller redirected to, including its `flash` prop,
 * or null when the server answered with something that is not an Inertia page.
 * Validation errors still arrive as normal 422 JSON and are thrown as
 * {@link ApiError}, so the forms behave exactly as before.
 */
export async function inertiaVisit<T = Record<string, unknown>>(
  path: string,
  options: InertiaVisitOptions = {},
): Promise<InertiaPage<T> | null> {
  if (options.referrer) await primePreviousUrl(options.referrer);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await ensureLaravelSession();
    const headers = new Headers({
      Accept: 'text/html, application/xhtml+xml',
      'X-Inertia': 'true',
      'X-Requested-With': 'XMLHttpRequest',
    });
    if (current.csrfToken) headers.set('X-CSRF-TOKEN', current.csrfToken);
    if (current.inertiaVersion) headers.set('X-Inertia-Version', current.inertiaVersion);

    let body: BodyInit | undefined;
    if (options.data) {
      if (options.json) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.data);
      } else {
        headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        const fields: Record<string, string> = {};
        for (const [key, value] of Object.entries(options.data)) {
          if (value !== null && value !== undefined) fields[key] = String(value);
        }
        body = formBody(fields);
      }
    }

    const response = await fetchWithStatus(url(path), {
      method: options.method ?? 'POST',
      headers,
      body,
      credentials: 'include',
    });

    if (response.status === 419 && attempt === 0) {
      clearSessionCache();
      continue;
    }

    // A stale Inertia version answers 409; re-bootstrap and try once more so a
    // deployment rollout does not fail the write the student just tapped.
    if ((response.status === 409 || response.status === 412) && attempt === 0) {
      clearSessionCache();
      continue;
    }

    const contentType = response.headers.get('content-type') || '';
    const raw = contentType.includes('application/json') ? await response.json() : await response.text();

    if (response.status === 401 || landedOnLogin(response, path)) {
      throw new SessionExpiredError(response.url || path);
    }

    if (!response.ok) {
      throw new ApiError(
        messageFromBody(raw, 'The LIBTRACK request failed.'),
        response.status,
        errorsFromBody(raw),
        response.url,
      );
    }

    if (typeof raw === 'string') return extractInertiaPage<T>(raw);
    if (raw && typeof raw === 'object' && 'component' in raw) return raw as InertiaPage<T>;
    return null;
  }

  throw new ApiError('The LIBTRACK request could not be completed.', 419, {}, url(path));
}

export async function getDashboard(): Promise<InertiaPage<DashboardProps>> {
  return inertiaPage<DashboardProps>('/student/dashboard', 0, ['user', 'stats']);
}

export async function getBooks(options: { search?: string; categoryId?: string; page?: number } = {}): Promise<InertiaPage<BooksProps>> {
  const params = new URLSearchParams();
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.categoryId) params.set('category_id', options.categoryId);
  if (options.page && options.page > 1) params.set('page', String(options.page));
  const query = params.toString();
  return inertiaPage<BooksProps>(`/books${query ? `?${query}` : ''}`, 0, ['books']);
}

export async function getBorrowings(): Promise<InertiaPage<BorrowingsProps>> {
  return inertiaPage<BorrowingsProps>('/borrowings', 0, ['borrowings']);
}

export async function getBookQr(bookId: string | number): Promise<string> {
  const response = await fetchWithStatus(url(`/books/${bookId}/qr-code`), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'image/png,image/svg+xml,application/octet-stream',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new ApiError('Unable to load this book QR code.', response.status, {}, response.url);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the book QR code.'));
    reader.readAsDataURL(blob);
  });
}

export type BookReadProps = {
  book: {
    id: number | string;
    title: string;
    author?: string | null;
    pdf_url: string;
    pdf_size?: number | null;
    available_copies?: number | null;
  };
  bookStates?: BookStates;
};

export async function getBookRead(bookId: string | number): Promise<InertiaPage<BookReadProps>> {
  return inertiaPage<BookReadProps>(`/books/${bookId}/read`, 0, ['book']);
}

export async function getFines(): Promise<InertiaPage<FinesProps>> {
  return inertiaPage<FinesProps>('/my-fines', 0, ['fines']);
}

export type RegistrationLookup = {
  ok: true;
  lrn: string;
  name: string;
  school_id: number;
  school_name: string | null;
  school_code: string | null;
  grade_level: string | null;
  section: string | null;
  /** Present once the LRN registry stores a contact number. */
  phone?: string | null;
  academic_strand?: string | null;
};

export type RegistrationInitiation = {
  otp_id?: number;
  expires_at?: string | null;
  phone_masked?: string | null;
  name?: string | null;
  school_name?: string | null;
  lrn?: string | null;
  sent?: boolean;
  debug_code?: string | null;
};

export type RegistrationPageProps = {
  pending?: {
    phone_masked?: string | null;
    expires_at?: string | null;
    name?: string | null;
    school_name?: string | null;
    lrn?: string | null;
  } | null;
  auth?: { user?: StudentUser | null };
  flash?: { success?: string | null; error?: string | null; info?: string | null };
};

function formBody(values: Record<string, string>): URLSearchParams {
  return new URLSearchParams(values);
}

export async function lookupLrn(lrn: string): Promise<RegistrationLookup> {
  return request<RegistrationLookup>('/mobile/register/lookup-lrn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
    body: formBody({ lrn }),
  });
}

export async function getRegistrationPage(): Promise<InertiaPage<RegistrationPageProps>> {
  return inertiaPage<RegistrationPageProps>('/mobile/register');
}

export async function initiateRegistration(values: {
  lrn: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): Promise<RegistrationPageProps> {
  await request('/mobile/register/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
    body: formBody(values),
  });
  return (await getRegistrationPage()).props;
}

export async function resendRegistrationOtp(values: { lrn: string; phone: string }): Promise<RegistrationPageProps> {
  await request('/mobile/register/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
    body: formBody(values),
  });
  return (await getRegistrationPage()).props;
}

export async function verifyRegistration(values: {
  code: string;
  lrn: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await request('/mobile/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
    body: formBody(values),
  });
  await getDashboard();
}

export async function cancelRegistration(): Promise<void> {
  await request('/mobile/register/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
    body: formBody({}),
  });
  await getRegistrationPage();
}

export async function requestReturn(payload: { transaction_id?: number; scanned_qr?: string }): Promise<{ ok: boolean; message?: string }> {
  return request<{ ok: boolean; message?: string }>('/borrowings/return-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------- own profile */

export type ProfileValues = {
  name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
};

export type ProfileProps = {
  user: ProfileValues;
  flash?: { success?: string | null; error?: string | null; info?: string | null; id?: string | null };
};

/**
 * The Settings page's own copies of the name parts.
 *
 * The dashboard only carries the display name, so the profile form reads this
 * first: splitting "Maria Clara Santos" back into first/middle/last in the app
 * would guess, and the server already knows.
 */
export async function getProfile(): Promise<InertiaPage<ProfileProps>> {
  return inertiaPage<ProfileProps>('/user/settings', 0, ['user']);
}

export type ProfileUpdate = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
};

export async function updateProfile(values: ProfileUpdate): Promise<{ ok: boolean; name: string }> {
  const page = await inertiaVisit<ProfileProps>('/user/settings/profile', {
    method: 'PUT',
    json: true,
    data: {
      first_name: values.first_name,
      middle_name: values.middle_name ?? '',
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
    },
    referrer: '/user/settings',
  });

  const flash = page?.props?.flash;
  if (flash?.error) throw new ApiError(flash.error, 422);

  const name = page?.props?.user?.name
    ?? [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { ok: true, name };
}

export async function updatePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/user/settings/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* --------------------------------------------------------------- borrow cart */

export type BorrowCartScan = {
  book: {
    id: number | string;
    title?: string | null;
    author?: string | null;
    location?: string | null;
    cover_image_url?: string | null;
    available_copies?: number | null;
    has_pdf?: boolean | null;
    state?: 'borrowed' | 'reserved' | 'cart' | null;
  };
  copy: { id: number | string; label: string; available: boolean } | null;
};

/** What a scanned shelf label is, before it is put in the cart. */
export async function lookupBorrowCartQr(qr: string): Promise<BorrowCartScan> {
  return request<BorrowCartScan>(`/borrow-cart/lookup?qr=${encodeURIComponent(qr)}`, {
    headers: { Accept: 'application/json' },
  });
}

export async function logoutWithLaravel(): Promise<void> {
  try {
    await request('/logout', { method: 'GET', headers: { Accept: 'text/html, application/xhtml+xml' } });
  } catch {
    // Local session state is still cleared if the network logout fails.
  }
  // Drop the saved cookie snapshot, otherwise a sign-out would be undone on the
  // next cold start.
  clearSavedSessionCookies();
}

export async function getCurrentSession<T = Record<string, unknown>>(): Promise<InertiaPage<T>> {
  return inertiaPage<T>('/student/dashboard');
}

export function resetLaravelSession(): void {
  clearSessionCache();
}
