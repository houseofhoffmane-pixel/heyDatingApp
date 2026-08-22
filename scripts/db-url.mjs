/**
 * Assemble DATABASE_URL from separate DB_* env vars so hosts (like
 * Hostinger's env-var UI) don't force us to URL-encode passwords.
 *
 * If DATABASE_URL is already set, it wins — no change.
 * Otherwise: DB_USER + DB_PASS + DB_HOST + DB_PORT + DB_NAME assemble
 * into a proper mysql:// URL with encodeURIComponent applied to
 * user + password.
 *
 * Exports:
 *   - resolveDatabaseUrl() — sets process.env.DATABASE_URL as a side
 *     effect, returns nothing. Safe to call multiple times.
 *   - CLI: `node scripts/db-url.mjs -- <cmd> <args...>` sets the URL
 *     then spawns <cmd> — used to wrap `prisma migrate deploy` etc.
 */

import { spawn } from 'node:child_process';

export function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  if (!process.env.DB_USER || !process.env.DB_NAME) return;

  const user = encodeURIComponent(process.env.DB_USER);
  const pass = encodeURIComponent(process.env.DB_PASS ?? '');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME;

  process.env.DATABASE_URL = `postgres://${user}:${pass}@${host}:${port}/${name}`;
  // eslint-disable-next-line no-console
  console.log(`[db-url] assembled from parts: ${process.env.DB_USER}@${host}:${port}/${name}`);
}

// CLI mode — assemble URL, then exec whatever comes after `--`.
if (import.meta.url === `file://${process.argv[1]}`) {
  resolveDatabaseUrl();

  const sep = process.argv.indexOf('--');
  const rest = sep >= 0 ? process.argv.slice(sep + 1) : process.argv.slice(2);
  if (rest.length === 0) {
    // Just print the assembled URL (masking the password).
    const url = process.env.DATABASE_URL ?? '(not set — provide DATABASE_URL or DB_USER + DB_NAME)';
    // eslint-disable-next-line no-console
    console.log(url.replace(/:[^:@]+@/, ':***@'));
    process.exit(0);
  }

  // shell:true so `npm`/`npx` are resolved via PATH the way the host's
  // login shell would resolve them. rest is joined with spaces — fine
  // for our uses (no args with spaces).
  const child = spawn(rest.join(' '), { stdio: 'inherit', shell: true });
  child.on('exit', (code) => process.exit(code ?? 1));
}
