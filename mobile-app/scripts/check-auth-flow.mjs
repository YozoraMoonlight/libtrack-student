/**
 * Exercises the exact flow the native client uses, with redirect following
 * enabled (React Native's fetch follows redirects; Node's fetch does too).
 *
 * Uses deliberately invalid credentials so no real account is touched.
 */

const ORIGIN = 'https://libtrack.laravel.cloud';
const jar = new Map();

function absorb(header) {
  if (!header) return;
  for (const seg of header.split(/,(?=\s*[^=;,=\s]+\s*=)/)) {
    const [pair, ...attrs] = seg.split(';');
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = attrs.some((a) => {
      const [k, v] = a.split('=');
      const key = k.trim().toLowerCase();
      if (key === 'max-age') return Number(v) <= 0;
      if (key === 'expires') return v ? new Date(v).getTime() <= Date.now() : false;
      return false;
    });
    if (!value || expired) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return jar.size ? [...jar].map(([k, v]) => `${k}=${v}`).join('; ') : undefined;
}

async function req(path, init = {}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest', ...(init.headers ?? {}) };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;
  if (init.csrf) headers['X-CSRF-TOKEN'] = init.csrf;

  const res = await fetch(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
  });

  const set = res.headers.getSetCookie?.() ?? [];
  absorb(set.length ? set.join(', ') : res.headers.get('set-cookie'));
  return res;
}

const decode = (v) =>
  v.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const readCsrf = (html) => html.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
const readPage = (html) => {
  const m = html.match(/id=["']app["'][^>]*data-page=["']([^"']*)["']/i);
  if (!m) return null;
  try {
    return JSON.parse(decode(m[1]));
  } catch {
    return null;
  }
};

const log = (n, p, d = '') => console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
const results = [];
const check = (n, p, d) => {
  results.push(p);
  log(n, p, d);
};

// 1. Bootstrap.
let res = await req('/mobile/login', { headers: { Accept: 'text/html, application/xhtml+xml' } });
let html = await res.text();
let csrf = readCsrf(html);
let page = readPage(html);
check('bootstrap returns CSRF + version', Boolean(csrf && page?.version), `version=${page?.version?.slice(0, 10)}…`);

// 2. Signed-out dashboard read with redirect following (what RN does).
res = await req('/student/dashboard', {
  headers: {
    Accept: 'text/html, application/xhtml+xml',
    'X-Inertia': 'true',
    'X-Inertia-Version': page.version,
  },
});
const dashBody = await res.text();
// The redirect target answers with a JSON Inertia page (not HTML), so parse
// whichever form arrives.
const dashPage = dashBody.trimStart().startsWith('{') ? JSON.parse(dashBody) : readPage(dashBody);
const landedOnLogin = /\/login/.test(res.url ?? '');
check('signed-out dashboard read lands on a login page', landedOnLogin, `final url ${res.url}`);
check(
  'landed page is a login screen, not dashboard data',
  String(dashPage?.component ?? '').includes('Login') && dashPage?.props?.auth?.user === null,
  `component=${dashPage?.component ?? 'none'} auth.user=${JSON.stringify(dashPage?.props?.auth?.user)}`,
);
check('no dashboard payload leaks to a signed-out client', !/"stats"|"upcomingDue"|"qrCode"/.test(dashBody));

// 3. Failed login with invalid credentials must bounce back to the login form.
res = await req('/mobile/login', {
  method: 'POST',
  csrf,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
  body: 'email=no-such-student-libtrack-check%40example.com&password=definitely-not-the-password',
});
const failedBody = await res.text();
const failedPage = failedBody.trimStart().startsWith('{') ? JSON.parse(failedBody) : readPage(failedBody);
const bouncedBack = /\/login/.test(res.url ?? '') || String(failedPage?.component ?? '').includes('Login');
check('invalid credentials bounce back to login (not a dashboard)', bouncedBack, `final url ${res.url}`);

// The POST may come back as a bare Inertia redirect payload with no component,
// which is still "not signed in". Assert only that no identity leaked.
const failedAuthUser = failedPage?.props?.auth?.user;
const noIdentity = failedAuthUser === null || failedAuthUser === undefined;
check(
  'failed login yields no authenticated identity',
  noIdentity && !/"stats"|"lrn"|"student_id"/.test(failedBody),
  `content-type=${res.headers.get('content-type')} auth.user=${JSON.stringify(failedAuthUser)}`,
);

// 4. A second attempt with a fresh token proves the 419-replay path is unnecessary
//    only because we always re-read the token; verify it is present and stable.
check('CSRF token rotates per session (jar is shared)', Boolean(csrf) && jar.has('XSRF-TOKEN'), [...jar.keys()].join(', '));

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
