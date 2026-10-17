/**
 * Rasterises the notification large icon.
 *
 * Why this exists rather than shipping the VectorDrawable:
 * `@capacitor/local-notifications` resolves `largeIcon` with
 * `BitmapFactory.decodeResource()`, which returns null for a vector XML. The
 * small icon is fine as a vector (it goes through `setSmallIcon(int)`), but the
 * large icon has to be a real bitmap or the notification shows up with no
 * artwork at all.
 *
 * The owl is drawn here as SVG using the same geometry and palette as
 * OwlMascot.tsx, then rendered to PNG at each Android density.
 *
 * Run:  node scripts/build-notification-icon.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const resDir = resolve(here, '..', 'android', 'app', 'src', 'main', 'res');

/** Matches the 120x96 viewBox of the OwlMascot SVG. */
const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="96" viewBox="0 0 120 96">
  <g>
    <path d="M22,70 C22,50 36,38 58,40 V70 Z" fill="#e3a126"/>
    <path d="M98,70 C98,50 84,38 62,40 V70 Z" fill="#e3a126"/>
    <path d="M16,116 V40 L24,18 L40,30 H80 L96,18 L104,40 V116 Z" fill="#f6b93d"/>
    <circle cx="43" cy="52" r="14" fill="#fff6e3"/>
    <circle cx="77" cy="52" r="14" fill="#fff6e3"/>
    <circle cx="43" cy="52" r="6" fill="#1f1a17"/>
    <circle cx="77" cy="52" r="6" fill="#1f1a17"/>
    <path d="M55,62 H65 L60,70 Z" fill="#d9682b"/>
    <rect x="34" y="86" width="14" height="7" rx="3.5" fill="#d9682b"/>
    <rect x="72" y="86" width="14" height="7" rx="3.5" fill="#d9682b"/>
  </g>
</svg>`;

/**
 * Android densities for a notification large icon.
 *
 * The expanded card shows it at roughly 48-72dp depending on the launcher, so
 * xxxhdpi carries the detail and the smaller buckets are for cheap devices.
 */
const targets = [
  { dir: 'drawable-mdpi', size: 96 },
  { dir: 'drawable-hdpi', size: 144 },
  { dir: 'drawable-xhdpi', size: 192 },
  { dir: 'drawable-xxhdpi', size: 288 },
  { dir: 'drawable-xxxhdpi', size: 384 },
];

const source = Buffer.from(OWL_SVG);

for (const { dir, size } of targets) {
  const outDir = resolve(resDir, dir);
  await mkdir(outDir, { recursive: true });

  // Square canvas so the system does not letterbox the owl unevenly.
  const png = await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const out = resolve(outDir, 'ic_notification_owl.png');
  await writeFile(out, png);
  console.log(`  ${dir}/ic_notification_owl.png  ${size}x${size}  ${png.length} bytes`);
}

console.log('\nNotification large icon rasterised.');