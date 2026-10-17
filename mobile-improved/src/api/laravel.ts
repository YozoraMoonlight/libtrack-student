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

type InertiaPage<T = Record<string, unknown>> = {
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
  total_copies?: number | null;
  available_copies?: number | null;
  status?: string | null;
  category?: { id?: number; name?: string | null } | null;
  [key: string]: unknown;
};

export type BooksProps = {
  books: Paginated<LiveBook>;
  categories: Array<{ id: number | string; name: string }>;
  filters?: { search?: string | null; category_id?: string | null; status?: string | null };
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
  type?: string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  channel?: string | null;
  actor?: string | null;
  is_read?: boolean | number | null;
  read_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
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

export async function getNotifications(): Promise<LiveNotification[]> {
  const body = await request<unknown>('/notifications/feed', {
    headers: { Accept: 'application/json' },
  });
  return notificationList(body);
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
    const record = body as { message?: unknown; reason?: unknown };
    if (typeof record.message === 'string' && record.message) return record.message;
    if (typeof record.reason === 'string' && record.reason) return record.reason;
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

export async function updateProfile(name: string): Promise<{ ok: boolean; name: string }> {
  return request<{ ok: boolean; name: string }>('/user/settings/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name }),
  });
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
