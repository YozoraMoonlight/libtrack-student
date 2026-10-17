/**
 * Contract check against the live Laravel host using the same request strategy
 * as the native client (cookie jar + CSRF + Inertia headers).
 *
 * Run: node scripts/check-live-contract.mjs
 * This only performs unauthenticated reads; it never submits credentials.
 */

const ORIGIN = 'https://libtrack.laravel.cloud';

const jar = new Map();

function absorbSetCookie(header) {
  if (!header) return;
  for (const segment of header.split(/,(?=\s*[^=;,=\s]+\s*=)/)) {
    const [pair, ...attributes] = segment.split(';');
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attributes.some((attribute) => {
      const [key, raw] = attribute.split('=');
      const k = key.trim().toLowerCase();
      if (k === 'max-age') return Number(raw) <= 0;
      if (k === 'expires') return raw ? new Date(raw).getTime() <= Date.now() : false;
      return false;
    });
    if (!value || expired) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  if (jar.size === 0) return undefined;
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path, init = {}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest', ...(init.headers ?? {}) };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;

  const response = await fetch(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
    redirect: 'manual',
  });

  const setCookie = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  if (setCookie.length) absorbSetCookie(setCookie.join(', '));
  else absorbSetCookie(response.headers.get('set-cookie'));

  return response;
}

function readCsrf(html) {
  const m = html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function readInertiaPage(html) {
  const m = html.match(/id=["']app["'][^>]*data-page=["']([^"']*)["']/i);
  if (!m) return null;
  const decoded = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log(`Checking ${ORIGIN}\n`);

// 1. Bootstrap the session.
const login = await req('/mobile/login', { headers: { Accept: 'text/html, application/xhtml+xml' } });
check('GET /mobile/login responds 200', login.status === 200, `status ${login.status}`);

const html = await login.text();
const csrf = readCsrf(html);
check('CSRF meta token present', Boolean(csrf), csrf ? `${csrf.slice(0, 12)}…` : 'missing');
check('session cookies received', jar.size > 0, [...jar.keys()].join(', ') || 'none');

const bootPage = readInertiaPage(html);
check('Inertia page object embedded', Boolean(bootPage), bootPage ? `component=${bootPage.component}` : 'no data-page');
check('Inertia asset version present', Boolean(bootPage?.version), bootPage?.version ?? 'missing');

// 2. Unauthenticated Inertia read must not leak dashboard data.
//    The live app answers 409 when the client sends no/stale X-Inertia-Version.
const dash = await req('/student/dashboard', {
  headers: {
    Accept: 'text/html, application/xhtml+xml',
    'X-Inertia': 'true',
    'X-Inertia-Version': bootPage?.version ?? '',
    'X-Requested-With': 'XMLHttpRequest',
  },
});
const location = dash.headers.get('location') ?? '';
const inertiaLocation = dash.headers.get('x-inertia-location') ?? '';
const dashBody = await dash.text();
const leaksData = /"stats"|"upcomingDue"|"qrCode"/.test(dashBody);
const guarded = !leaksData && [401, 403, 409, 302].includes(dash.status);
check(
  'dashboard is guarded when signed out',
  guarded,
  `status ${dash.status}${location ? ` -> ${location}` : ''}${inertiaLocation ? ` (inertia-location ${inertiaLocation})` : ''}`,
);
check('dashboard leaks no student data when signed out', !leaksData);

// 3. CORS headers (informational: native fetch ignores them, browsers do not).
const cors = dash.headers.get('access-control-allow-origin');
check('CORS header absent (expected for native)', cors === null, cors ?? 'none');

// 3b. Public read endpoints the app depends on must exist and be reachable.
for (const route of ['/books', '/borrowings', '/my-fines', '/mobile/register']) {
  const probe = await req(route, {
    headers: {
      Accept: 'text/html, application/xhtml+xml',
      'X-Inertia': 'true',
      'X-Inertia-Version': bootPage?.version ?? '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  const ok = [200, 302, 401, 403, 409].includes(probe.status);
  check(`route ${route} reachable`, ok, `status ${probe.status}`);
}

// 4. JSON error shape used by messageFrom()/errorsFrom().
const bad = await req('/borrowings/return-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json', 'X-CSRF-TOKEN': csrf ?? '' },
  body: 'scanned_qr=',
});
const badText = await bad.text();
let badJson = null;
try {
  badJson = JSON.parse(badText);
} catch {
  /* html response */
}
check('unauthenticated POST is rejected', bad.status === 401 || bad.status === 403 || bad.status === 419 || bad.status === 422, `status ${bad.status}`);
check(
  'rejection body is machine readable',
  badJson !== null || badText.trim().startsWith('<'),
  badJson ? `keys=${Object.keys(badJson).join(',')}` : 'html',
);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
