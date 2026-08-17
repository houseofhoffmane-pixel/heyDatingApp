/**
 * Copy the built web app from web/dist into backend/public so Nest's
 * ServeStaticModule can serve it in the single-process deploy.
 *
 * Uses fs.cp (Node 16.7+) for a portable recursive copy — no rm/cp
 * shell calls, so this runs the same on macOS, Linux, and Windows.
 *
 * Run automatically by the root `build` script; safe to run manually
 * after `npm --prefix web run build`.
 */

import { rm, mkdir, cp, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here    = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(here, '..');
const src     = resolve(repoDir, 'web', 'dist');
const dst     = resolve(repoDir, 'backend', 'public');

try {
  await stat(src);
} catch {
  console.error(
    `[copy-web-build] ${src} not found. ` +
    `Run \`npm --prefix web run build\` first.`,
  );
  process.exit(1);
}

await rm(dst, { recursive: true, force: true });
await mkdir(dst, { recursive: true });
await cp(src, dst, { recursive: true });

console.log(`[copy-web-build] web/dist → backend/public`);
