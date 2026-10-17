/**
 * Mock-data guard.
 *
 * `data/currentStudent.ts` is a hardcoded prototype student ("Juan Dela Cruz",
 * student@gmail.com). It belongs to the decorative pages only — the demo
 * walkthroughs, Night Shelf and the update log art. It must never reach a screen
 * that talks to the live backend, because a signed-in student would then see
 * someone else's name and email in the account menu and settings.
 *
 * This script fails the build if a live page or component starts importing it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

/** Screens and components that render real student data. */
const LIVE_PREFIXES = [
  'pages/Dashboard.tsx',
  'pages/BrowseBooks.tsx',
  'pages/Borrowings.tsx',
  'pages/Fines.tsx',
  'pages/Settings.tsx',
  'pages/Login.tsx',
  'pages/Register.tsx',
  'pages/ForgotPassword.tsx',
  'components/app/AccountMenu.tsx',
  'components/settings/',
  'components/app/notifications/',
];

const FORBIDDEN = [
  { pattern: /data\/currentStudent/, why: 'hardcoded prototype student' },
  { pattern: /data\/books/, why: 'hardcoded catalog' },
  { pattern: /data\/borrowings/, why: 'hardcoded loans' },
  { pattern: /data\/fines/, why: 'hardcoded fines' },
  { pattern: /data\/students/, why: 'hardcoded students' },
  { pattern: /data\/notifications/, why: 'hardcoded notifications' },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split('\\').join('/');
  const isLive = LIVE_PREFIXES.some((prefix) => rel.startsWith(prefix));
  if (!isLive) continue;

  const source = readFileSync(file, 'utf8');
  for (const { pattern, why } of FORBIDDEN) {
    if (pattern.test(source)) {
      problems.push(`  ${rel} imports ${pattern.source} (${why})`);
    }
  }
}

if (problems.length) {
  console.error('\nMock data leaked into live screens:\n');
  console.error(problems.join('\n'));
  console.error('\nLive screens must read from api/laravel.ts or useAuth().\n');
  process.exit(1);
}

console.log('mock-data guard: clean');
