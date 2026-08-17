/**
 * Typed environment loader. Parses & validates process.env once, exposes
 * everything as `env`. Throws on boot if a required var is missing.
 *
 * Ship-scope after Sprint 2 — no admin, verification, geocoding, or
 * check-in vars, and no Redis. Single-process deploy on Hostinger.
 *
 * DATABASE_URL can be provided directly OR assembled from DB_USER +
 * DB_PASS + DB_HOST + DB_PORT + DB_NAME (the assembly happens here at
 * the top of loadEnv so import ordering can't ever leave it stale).
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
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;

  // Assemble DATABASE_URL from parts FIRST so the schema check below
  // sees the resolved URL. Runs at whichever loadEnv() call comes
  // first — no import-order trap.
  resolveDatabaseUrl();

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    // eslint-disable-next-line no-console
    console.error('[env] Invalid environment:', JSON.stringify(formatted, null, 2));
    // eslint-disable-next-line no-console
    console.error(
      '[env] For DATABASE_URL you can either provide the full URL, ' +
      'or set DB_USER + DB_PASS + DB_HOST + DB_PORT + DB_NAME as separate ' +
      'vars (we assemble it with proper URL encoding).',
    );
    throw new Error('Invalid environment configuration');
  }
  if (parsed.data.NODE_ENV === 'production') {
    assertProductionSecrets(parsed.data);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Populate process.env.DATABASE_URL from DB_USER/DB_PASS/DB_HOST/DB_PORT/DB_NAME
 * if the URL wasn't provided directly. Idempotent, safe to call anywhere.
 * Handles URL-encoding of user/pass so weird characters in the password
 * don't break the connection string.
 */
function resolveDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  if (!process.env.DB_USER || !process.env.DB_NAME) return;

  const user = encodeURIComponent(process.env.DB_USER);
  const pass = encodeURIComponent(process.env.DB_PASS ?? '');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const name = process.env.DB_NAME;

  process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;
  // eslint-disable-next-line no-console
  console.log(`[env] Assembled DATABASE_URL from parts (user=${process.env.DB_USER} host=${host}:${port} db=${name})`);
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
    if (v === 'change-me' || v === 'changeme') bad.push(`${name} is still the placeholder value`);
  };

  weak('JWT_ACCESS_SECRET',  e.JWT_ACCESS_SECRET);
  weak('JWT_REFRESH_SECRET', e.JWT_REFRESH_SECRET);

  if (e.JWT_ACCESS_SECRET === e.JWT_REFRESH_SECRET) {
    bad.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (e.OTP_STUB_CODE && e.TWILIO_PROVIDER === 'stub') {
    // Not a hard fail — you might legitimately want stub OTP in prod
    // for a soft launch — but warn loudly.
    // eslint-disable-next-line no-console
    console.warn(
      '[env] WARNING: TWILIO_PROVIDER=stub in production. Anyone with a phone number can log in with OTP_STUB_CODE.',
    );
  }

  if (bad.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[env] Refusing to boot in production with insecure config:\n' + bad.map((b) => '  - ' + b).join('\n'));
    throw new Error('Insecure production environment — see log above');
  }
}
