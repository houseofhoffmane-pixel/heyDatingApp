/**
 * Runtime counterpart of ../../../scripts/db-url.mjs — assembles
 * DATABASE_URL from separate DB_* env vars if it isn't already set.
 *
 * Runs as the very first thing in main.ts, before any @prisma/client
 * import, so PrismaClient sees the resolved URL when it constructs.
 * Idempotent — safe to call twice.
 */
export function resolveDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  if (!process.env.DB_USER || !process.env.DB_NAME) return;

  const user = encodeURIComponent(process.env.DB_USER);
  const pass = encodeURIComponent(process.env.DB_PASS ?? '');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const name = process.env.DB_NAME;

  process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;
}
