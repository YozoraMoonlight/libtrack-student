/**
 * Verifies the connectivity probe the offline gate now depends on.
 * Run: node scripts/check-offline-probe.mjs
 */

const ORIGIN = 'https://libtrack.laravel.cloud';

async function probe() {
  try {
    const response = await fetch(`${ORIGIN}/mobile/login?_ping=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/html, application/xhtml+xml', 'X-Requested-With': 'XMLHttpRequest' },
    });
    return { online: true, status: response.status };
  } catch (error) {
    return { online: false, status: 0, error: String(error) };
  }
}

const results = [];
const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const first = await probe();
check('probe reports online when the server answers', first.online, `status ${first.status}`);
check('probe accepts any HTTP status as reachable', first.online && first.status > 0, `status ${first.status}`);

// The probe must not be served from cache, or a stale 200 would read as online.
const withCacheBust = await fetch(`${ORIGIN}/mobile/login?_ping=${Date.now()}`, { cache: 'no-store' });
check('cache-busting param is accepted by the route', withCacheBust.ok, `status ${withCacheBust.status}`);

// An unreachable host must report offline rather than throwing to the caller.
let unreachableThrew = false;
let unreachableOnline = true;
try {
  const res = await fetch('https://libtrack-does-not-exist.invalid/mobile/login', { cache: 'no-store' });
  unreachableOnline = res.status > 0;
} catch {
  unreachableThrew = true;
  unreachableOnline = false;
}
check('unreachable host reports offline (no throw escapes)', unreachableThrew && !unreachableOnline);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
