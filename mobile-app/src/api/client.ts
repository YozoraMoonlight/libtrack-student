import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Live Laravel session client for the native app.
 *
 * The mobile app authenticates against the same session/Inertia routes the web
 * app uses, so we need three things a plain fetch does not give us:
 *   1. a cookie jar (Laravel's encrypted session + XSRF cookies)
 *   2. the CSRF token from the login page
 *   3. Inertia page/version handling
 *
 * Native networking has no browser CORS layer, so this talks to the live
 * origin directly.
 */

const COOKIE_KEY = 'libtrack_cookies_v1';
const CSRF_KEY = 'libtrack_csrf_v1';

export const API_ORIGIN = (
  (globalThis as { process?: { env?: { API_URL?: string } } }).process?.env?.API_URL ??
  (Constants.expoConfig?.extra as { origin?: string } | undefined)?.origin ??
  'https://libtrack.laravel.cloud'
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status = 0, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super('Your LIBTRACK session expired. Please sign in again.', 401);
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
  version: string | null;
};

/* ------------------------------------------------------------------ cookies */

type CookieJar = Record<string, string>;

let jar: CookieJar = {};
let jarLoaded = false;
let jarWrite: Promise<void> = Promise.resolve();

async function loadJar(): Promise<CookieJar> {
  if (jarLoaded) return jar;
  try {
    const raw = await AsyncStorage.getItem(COOKIE_KEY);
    if (raw) jar = JSON.parse(raw) as CookieJar;
  } catch {
    jar = {};
  }
  jarLoaded = true;
  return jar;
}

function persistJar(): void {
  const snapshot = JSON.stringify(jar);
  jarWrite = jarWrite.then(() => AsyncStorage.setItem(COOKIE_KEY, snapshot)).catch(() => undefined);
}

/** Splits a combined `set-cookie` header without breaking `Expires=Wed, 21 Oct ...`. */
function splitSetCookie(raw: string): string[] {
  return raw.split(/,(?=\s*[^=;,=\s]+\s*=)/);
}

function absorbSetCookie(header: string | null): void {
  if (!header) return;

  for (const segment of splitSetCookie(header)) {
    const [pair, ...attributes] = segment.split(';');
    const eq = pair.indexOf('=');
    if (eq < 1) continue;

    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();

    const expired = attributes.some((attribute) => {
      const [key, raw] = attribute.split('=');
      const name2 = key.trim().toLowerCase();
      if (name2 === 'max-age') return Number(raw) <= 0;
      if (name2 === 'expires') return raw ? new Date(raw).getTime() <= Date.now() : false;
      return false;
    });

    if (!value || expired) delete jar[name];
    else jar[name] = value;
  }

  persistJar();
}

function cookieHeader(): string | null {
  const entries = Object.entries(jar);
  if (entries.length === 0) return null;
  return entries.map(([name, value]) => `${name}=${value}`).join('; ');
}

/* ------------------------------------------------------------------- csrf */

let csrfToken: string | null = null;
let inertiaVersion: string | null = null;
let bootstrap: Promise<void> | null = null;

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');
}

function readCsrf(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]) : null;
}

function readInertiaPage<T>(html: string): InertiaPage<T> | null {
  const match = html.match(/id=["']app["'][^>]*data-page=["']([^"']*)["']/i);
  if (!match) return null;
  try {
    return JSON.parse(decodeEntities(match[1])) as InertiaPage<T>;
  } catch {
    return null;
  }
}

export function resetSessionCache(): void {
  csrfToken = null;
  inertiaVersion = null;
  bootstrap = null;
}

export async function ensureSession(): Promise<void> {
  if (csrfToken) return;
  if (!bootstrap) {
    bootstrap = (async () => {
      await loadJar();
      const response = await rawFetch('/mobile/login', {
        method: 'GET',
        headers: { Accept: 'text/html, application/xhtml+xml' },
      });

      if (!response.ok) {
        throw new ApiError('Unable to reach the LIBTRACK server.', response.status);
      }

      const html = await response.text();
      const token = readCsrf(html);
      if (!token) throw new ApiError('The LIBTRACK server did not return a CSRF token.', response.status);

      csrfToken = token;
      const page = readInertiaPage(html);
      inertiaVersion = page?.version ?? null;
      AsyncStorage.setItem(CSRF_KEY, token).catch(() => undefined);
    })().catch((error: unknown) => {
      bootstrap = null;
      throw error;
    });
  }
  return bootstrap;
}

/* ------------------------------------------------------------------ fetch */

type RawInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Skip the CSRF header (used by the bootstrap GET). */
  bare?: boolean;
};

async function rawFetch(path: string, init: RawInit): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  headers['X-Requested-With'] = 'XMLHttpRequest';

  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;

  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
    credentials: 'include',
  });

  absorbSetCookie(response.headers.get('set-cookie'));
  return response;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function errorsFrom(body: unknown): Record<string, string[]> {
  if (typeof body !== 'object' || body === null || !('errors' in body)) return {};
  const errors = (body as { errors: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) return {};
  return Object.fromEntries(
    Object.entries(errors as Record<string, unknown>).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(String) : [String(value)],
    ])
  );
}

function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null) {
    const record = body as { message?: unknown; errors?: Record<string, string[]> };
    if (typeof record.message === 'string' && record.message) return record.message;
    const firstError = record.errors ? Object.values(record.errors)[0]?.[0] : undefined;
    if (firstError) return firstError;
  }
  if (typeof body === 'string' && body.trim() && !body.startsWith('<')) return body.trim();
  return fallback;
}

function form(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/** True when a request meant for app data actually ended up on a login page. */
function landedOnLogin(response: Response, requestedPath: string): boolean {
  if (requestedPath.startsWith('/mobile/login') || requestedPath.startsWith('/mobile/register')) return false;

  const location = response.headers.get('location');
  if (location && /\/login/.test(location)) return true;

  // React Native follows redirects, so the final URL reveals the bounce.
  const finalUrl = typeof response.url === 'string' ? response.url : '';
  if (finalUrl && /\/login/.test(finalUrl)) return true;

  return false;
}

/** JSON/form request with session bootstrap, CSRF and one-shot 419 replay. */
export async function request<T = unknown>(path: string, init: RawInit = {}): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await ensureSession();

    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers ?? {}) };
    if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken;

    const response = await rawFetch(path, { ...init, headers });
    const body = await readBody(response);

    // Laravel regenerates the session after login; refresh once and replay.
    if (response.status === 419 && attempt === 0) {
      resetSessionCache();
      continue;
    }

    if (response.status === 401) throw new SessionExpiredError();
    if (landedOnLogin(response, path)) throw new SessionExpiredError();

    if (!response.ok) {
      throw new ApiError(messageFrom(body, 'The LIBTRACK request failed.'), response.status, errorsFrom(body));
    }

    return body as T;
  }

  throw new ApiError('The LIBTRACK request could not be completed.', 419);
}

export async function inertiaPage<T = Record<string, unknown>>(
  path: string,
  versionAttempt = 0,
): Promise<InertiaPage<T>> {
  await ensureSession();

  const headers: Record<string, string> = {
    Accept: 'text/html, application/xhtml+xml',
    'X-Inertia': 'true',
  };
  if (inertiaVersion) headers['X-Inertia-Version'] = inertiaVersion;

  const response = await rawFetch(path, { method: 'GET', headers });
  const body = await readBody(response);

  // Inertia answers 409 both for a stale asset version and for a redirect it
  // wants the client to follow as a full page load. Re-bootstrap once, then
  // give up rather than recursing.
  if (response.status === 409 || response.status === 412) {
    if (versionAttempt === 0) {
      resetSessionCache();
      await ensureSession();
      return inertiaPage<T>(path, 1);
    }
    throw new ApiError('The LIBTRACK session could not be refreshed. Please sign in again.', response.status);
  }

  if (response.status === 401) throw new SessionExpiredError();

  // `fetch` follows redirects transparently, so a signed-out request lands on
  // the login page with a 200. Catch that instead of parsing it as data.
  if (landedOnLogin(response, path)) throw new SessionExpiredError();

  if (!response.ok) {
    throw new ApiError(messageFrom(body, 'The LIBTRACK page request failed.'), response.status, errorsFrom(body));
  }

  if (typeof body !== 'string') return body as InertiaPage<T>;

  const page = readInertiaPage<T>(body);
  if (!page) throw new ApiError('The LIBTRACK server returned an unexpected page.', response.status);
  if (page.version) inertiaVersion = page.version;
  return page;
}

/* ------------------------------------------------------------------ routes */

export type StudentUser = {
  id?: number;
  name: string;
  email: string;
  lrn?: string | null;
  student_id?: string | null;
  school_id?: number | null;
  school_name?: string | null;
};

export type DashboardProps = {
  user: StudentUser;
  qrCode?: string | null;
  qrMime?: string | null;
  stats: { activeBorrows: number; totalBorrowed: number; unpaidFines: number };
  upcomingDue: Array<Record<string, unknown>>;
  recentActivity: Array<Record<string, unknown>>;
  auth?: { user?: StudentUser | null };
};

export type LiveBook = {
  id: number | string;
  title?: string | null;
  author?: string | null;
  isbn?: string | null;
  accession_number?: string | null;
  total_copies?: number | null;
  available_copies?: number | null;
  status?: string | null;
  category?: { id?: number; name?: string | null } | null;
};

export type Paginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

export type BooksProps = {
  books: Paginated<LiveBook>;
  categories: Array<{ id: number | string; name: string }>;
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
};

export type BorrowingsProps = {
  borrowings: Paginated<LiveBorrowing>;
  activeLoans: Array<Record<string, unknown>>;
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
};

export type FinesProps = {
  fines: Paginated<LiveFine>;
  totalUnpaid: number;
};

export async function loginWithLaravel(identifier: string, password: string): Promise<StudentUser> {
  await ensureSession();

  try {
    await request('/mobile/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form({ email: identifier, password }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) throw error;
    throw new ApiError('Those credentials do not match our records.', 422);
  }

  // Laravel redirects to the dashboard on success and bounces back to the login
  // page on failure. Confirm with a real read instead of trusting the redirect.
  try {
    const page = await inertiaPage<DashboardProps>('/student/dashboard');
    return page.props.user ?? page.props.auth?.user ?? ({} as StudentUser);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw new ApiError('Those credentials do not match our records.', 422);
    }
    throw error;
  }
}

export async function getDashboard(): Promise<DashboardProps> {
  return (await inertiaPage<DashboardProps>('/student/dashboard')).props;
}

export async function getBooks(
  options: { search?: string; categoryId?: string; page?: number } = {},
): Promise<BooksProps> {
  const params: string[] = [];
  if (options.search?.trim()) params.push(`search=${encodeURIComponent(options.search.trim())}`);
  if (options.categoryId) params.push(`category_id=${encodeURIComponent(options.categoryId)}`);
  if (options.page && options.page > 1) params.push(`page=${options.page}`);
  const query = params.length ? `?${params.join('&')}` : '';
  return (await inertiaPage<BooksProps>(`/books${query}`)).props;
}

export async function getBorrowings(): Promise<BorrowingsProps> {
  return (await inertiaPage<BorrowingsProps>('/borrowings')).props;
}

export async function getFines(): Promise<FinesProps> {
  return (await inertiaPage<FinesProps>('/my-fines')).props;
}

export async function getBookQr(bookId: string | number): Promise<string> {
  const response = await rawFetch(`/books/${bookId}/qr-code`, {
    method: 'GET',
    headers: { Accept: 'image/png,image/svg+xml,application/octet-stream' },
  });

  if (!response.ok) throw new ApiError('Unable to load this book QR code.', response.status);

  const blob = await response.blob();

  if (Platform.OS === 'web') {
    return URL.createObjectURL(blob);
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Unable to read the book QR code.'));
    reader.readAsDataURL(blob);
  });

  return `data:image/png;base64,${base64}`;
}

export async function requestReturn(payload: {
  transaction_id?: number | string;
  scanned_qr?: string;
}): Promise<{ ok: boolean; message?: string }> {
  return request('/borrowings/return-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(name: string): Promise<{ ok: boolean; name: string }> {
  return request('/user/settings/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function updatePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ ok: boolean; message?: string }> {
  return request('/user/settings/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function logoutWithLaravel(): Promise<void> {
  try {
    await request('/logout', { method: 'GET', headers: { Accept: 'text/html' } });
  } catch {
    // Local session is cleared regardless of the network result.
  }
  jar = {};
  persistJar();
  resetSessionCache();
  await AsyncStorage.multiRemove([COOKIE_KEY, CSRF_KEY]).catch(() => undefined);
}

/* ------------------------------------------------------------- registration */

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

export type RegistrationPending = {
  phone_masked?: string | null;
  expires_at?: string | null;
  name?: string | null;
  school_name?: string | null;
  lrn?: string | null;
};

export type RegistrationPageProps = {
  pending?: RegistrationPending | null;
  auth?: { user?: StudentUser | null };
  flash?: { success?: string | null; error?: string | null; info?: string | null };
};

export async function lookupLrn(lrn: string): Promise<RegistrationLookup> {
  return request<RegistrationLookup>('/mobile/register/lookup-lrn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form({ lrn }),
  });
}

export async function getRegistrationPage(): Promise<RegistrationPageProps> {
  return (await inertiaPage<RegistrationPageProps>('/mobile/register')).props;
}

export async function initiateRegistration(values: {
  lrn: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): Promise<RegistrationPending | null> {
  await request('/mobile/register/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form(values),
  });
  return (await getRegistrationPage()).pending ?? null;
}

export async function resendRegistrationOtp(values: { lrn: string; phone: string }): Promise<RegistrationPending | null> {
  await request('/mobile/register/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form(values),
  });
  return (await getRegistrationPage()).pending ?? null;
}

export async function verifyRegistration(values: {
  code: string;
  lrn: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): Promise<StudentUser> {
  await request('/mobile/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form(values),
  });
  return getDashboard().then((props) => props.user);
}

export async function cancelRegistration(): Promise<void> {
  await request('/mobile/register/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form({}),
  });
  await getRegistrationPage();
}
