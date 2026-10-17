import { setApiOnline } from '../offline/connection';

const DEFAULT_ORIGIN = '';

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

export function ensureLaravelSession(): Promise<SessionState> {
  if (session.csrfToken) return Promise.resolve(session);
  if (!bootstrapPromise) {
    bootstrapPromise = establishSession().catch((error: unknown) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
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

    if (response.status === 401 || response.redirected && response.url.includes('/login')) {
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

  await request('/mobile/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form,
  });

  // The mobile controller redirects to /dashboard after a successful login.
  // The next Inertia read verifies the session instead of trusting the redirect.
  await inertiaPage('/student/dashboard');
}

export async function inertiaPage<T = Record<string, unknown>>(path: string): Promise<InertiaPage<T>> {
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

  if (response.status === 409 || response.status === 412) {
    clearSessionCache();
    await ensureLaravelSession();
    return inertiaPage<T>(path);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (response.status === 401 || response.redirected && response.url.includes('/login')) {
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

  if (contentType.includes('application/json')) {
    return body as InertiaPage<T>;
  }

  const page = extractInertiaPage<T>(body as string);
  if (!page) throw new ApiError('The LIBTRACK server returned an unexpected page.', response.status, {}, response.url);
  return page;
}

export async function getDashboard(): Promise<InertiaPage<DashboardProps>> {
  return inertiaPage<DashboardProps>('/student/dashboard');
}

export async function getBooks(options: { search?: string; categoryId?: string; page?: number } = {}): Promise<InertiaPage<BooksProps>> {
  const params = new URLSearchParams();
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.categoryId) params.set('category_id', options.categoryId);
  if (options.page && options.page > 1) params.set('page', String(options.page));
  const query = params.toString();
  return inertiaPage<BooksProps>(`/books${query ? `?${query}` : ''}`);
}

export async function getBorrowings(): Promise<InertiaPage<BorrowingsProps>> {
  return inertiaPage<BorrowingsProps>('/borrowings');
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
  return inertiaPage<FinesProps>('/my-fines');
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
}

export async function getCurrentSession<T = Record<string, unknown>>(): Promise<InertiaPage<T>> {
  return inertiaPage<T>('/student/dashboard');
}

export function resetLaravelSession(): void {
  clearSessionCache();
}
