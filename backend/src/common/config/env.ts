/**
 * Typed environment loader. Parses & validates process.env once, exposes
 * everything as `env`. Throws on boot if a required var is missing.
 * In development missing vars fall back to safe defaults (matching
 * docker-compose).
 *
 * Ship-scope after Sprint 2 — no admin, verification, geocoding, or
 * check-in vars, and no Redis. Single-process deploy on Hostinger.
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
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    // eslint-disable-next-line no-console
    console.error('Invalid environment:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_t, prop) {
    return loadEnv()[prop as keyof Env];
  },
});
