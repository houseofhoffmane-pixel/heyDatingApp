/**
 * Typed environment loader. Parses & validates process.env once, exposes
 * everything as `env`.
 *
 * DATABASE_URL can be provided directly OR assembled from DB_USER +
 * DB_PASS + DB_HOST + DB_PORT + DB_NAME. If neither works, the loader
 * falls back to a placeholder URL so the app can still boot and
 * /health can report the real problem — better than an opaque module-
 * init crash before any of our diagnostic code runs.
 */

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('60d'),

  TWILIO_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SID: z.string().optional(),
  OTP_STUB_CODE: z.string().default('123456'),

  S3_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_STUB_DIR: z.string().default('./.local-s3'),
  PUBLIC_BASE_URL: z.string().optional(),
  PHOTO_MAX_MB: z.coerce.number().int().positive().default(10),
  STORAGE_URL_TTL_S: z.coerce.number().int().positive().default(900),

  FCM_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CREDENTIALS_JSON: z.string().optional(),

  UNMATCH_SILENCE_DAYS: z.coerce.number().int().positive().default(14),
  ACCOUNT_PURGE_DAYS: z.coerce.number().int().positive().default(30),

  FEED_W_RECENCY: z.coerce.number().default(0.30),
  FEED_W_MUTUAL_INTERESTS: z.coerce.number().default(0.25),
  FEED_W_DISTANCE: z.coerce.number().default(0.20),
  FEED_W_RECIPROCAL: z.coerce.number().default(0.20),
  FEED_W_RECENT_SHOWN_PENALTY: z.coerce.number().default(0.05),

  RL_OTP_PER_HOUR: z.coerce.number().int().default(5),
  RL_LIKES_PER_DAY: z.coerce.number().int().default(200),
  RL_REPORTS_PER_DAY: z.coerce.number().int().default(10),
  RL_MESSAGES_PER_MIN: z.coerce.number().int().default(60),

  JWT_ACCESS_SECRET_FALLBACK: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

/** Placeholder used when DATABASE_URL can't be resolved. Prisma will
 * refuse to connect against this and log a clear error on the first
 * query — much better UX than crashing at module-import time. */
const PLACEHOLDER_URL = 'mysql://placeholder:placeholder@127.0.0.1:3306/placeholder';

let cached: Env | null = null;

// Write direct to stderr — synchronous, always flushed, always visible
// in Hostinger's log even when the process is about to crash.
const err = (line: string) => process.stderr.write(line + '\n');

export function loadEnv(): Env {
  if (cached) return cached;

  resolveDatabaseUrl();

  // Fill placeholder JWT secrets so validation passes even in
  // half-configured environments. We DO NOT run in production with
  // these — the assertProductionSecrets check below refuses.
  if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'placeholder-access-secret-not-for-production';
  if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'placeholder-refresh-secret-not-for-production';

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    err('[env] Zod validation failed: ' + JSON.stringify(parsed.error.format()));
    // Instead of throwing, coerce to defaults where we can. Anything
    // still missing after this = a real config bug the user must fix,
    // but the app boots so /health can tell them.
    process.env.DATABASE_URL = process.env.DATABASE_URL || PLACEHOLDER_URL;
    const retry = schema.safeParse(process.env);
    if (!retry.success) {
      err('[env] Fatal — cannot boot with this env. Missing/bad: ' + JSON.stringify(retry.error.format()));
      throw new Error('Invalid environment — see stderr above');
    }
    cached = retry.data;
  } else {
    cached = parsed.data;
  }

  if (cached.NODE_ENV === 'production' && cached.DATABASE_URL === PLACEHOLDER_URL) {
    err('[env] WARNING: DATABASE_URL is the placeholder. DB queries will fail. Set DATABASE_URL or DB_USER+DB_PASS+DB_HOST+DB_NAME in Hostinger.');
  }
  if (cached.NODE_ENV === 'production') {
    assertProductionSecrets(cached);
  }
  return cached;
}

/**
 * Assembles DATABASE_URL from DB_* env vars. Loud stderr logs at every
 * decision point so the reason it succeeds/fails is visible in
 * Hostinger's log.
 */
function resolveDatabaseUrl(): void {
  const allDbKeys = Object.keys(process.env).filter((k) => k.startsWith('DB_') || k === 'DATABASE_URL');
  err(`[env] visible DB-related env keys: ${JSON.stringify(allDbKeys)}`);
  err(`[env] total process.env keys: ${Object.keys(process.env).length}`);

  if (process.env.DATABASE_URL) {
    err('[env] DATABASE_URL already set — using it as-is');
    return;
  }

  const user = (process.env.DB_USER ?? '').trim();
  const name = (process.env.DB_NAME ?? '').trim();
  const pass = process.env.DB_PASS ?? '';
  const host = (process.env.DB_HOST ?? '').trim() || 'localhost';
  const port = (process.env.DB_PORT ?? '').trim() || '3306';

  err(`[env] DB parts — user="${user}" (len ${user.length}) pass-len=${pass.length} host="${host}" port="${port}" name="${name}" (len ${name.length})`);

  if (!user || !name) {
    err('[env] Cannot assemble DATABASE_URL — DB_USER and DB_NAME must be non-empty. Falling back to placeholder.');
    return;
  }

  process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
  err(`[env] Assembled DATABASE_URL: mysql://${user}:***@${host}:${port}/${name}`);
}

/**
 * Hard-fail on boot if production is running with dev defaults or weak
 * secrets. Cheaper than discovering a signed-with-'dev-secret' JWT in
 * the wild.
 */
function assertProductionSecrets(e: Env): void {
  const bad: string[] = [];

  const weak = (name: string, v: string) => {
    if (v.length < 32) bad.push(`${name} must be ≥32 chars in production (got ${v.length})`);
    if (/^dev[-_]/i.test(v)) bad.push(`${name} looks like a dev placeholder (starts with "dev-")`);
    if (/^test[-_]/i.test(v)) bad.push(`${name} looks like a test placeholder (starts with "test-")`);
    if (/placeholder/i.test(v)) bad.push(`${name} is the placeholder value — set a real secret`);
    if (v === 'change-me' || v === 'changeme') bad.push(`${name} is still the placeholder value`);
  };

  weak('JWT_ACCESS_SECRET',  e.JWT_ACCESS_SECRET);
  weak('JWT_REFRESH_SECRET', e.JWT_REFRESH_SECRET);

  if (e.JWT_ACCESS_SECRET === e.JWT_REFRESH_SECRET) {
    bad.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (e.OTP_STUB_CODE && e.TWILIO_PROVIDER === 'stub') {
    err('[env] WARNING: TWILIO_PROVIDER=stub in production. Anyone with a phone number can log in with OTP_STUB_CODE.');
  }

  if (bad.length > 0) {
    err('[env] Refusing to boot in production with insecure config:\n' + bad.map((b) => '  - ' + b).join('\n'));
    throw new Error('Insecure production environment — see stderr above');
  }
}
