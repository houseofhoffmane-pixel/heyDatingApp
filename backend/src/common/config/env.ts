/**
 * Typed environment loader. Parses & validates process.env once, exposes
 * everything as `env`. Throws on boot if a required var is missing in
 * production. In development missing vars fall back to safe defaults
 * (matching docker-compose).
 */

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('60d'),

  ADMIN_JWT_SECRET: z.string().min(16),
  ADMIN_JWT_TTL: z.string().default('8h'),

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

  REKOGNITION_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  REKOGNITION_REGION: z.string().default('us-east-1'),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0).max(100).default(90),
  REKOGNITION_STUB_CONFIDENCE: z.coerce.number().min(0).max(100).default(95),

  FCM_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CREDENTIALS_JSON: z.string().optional(),

  MAPBOX_PROVIDER: z.enum(['stub', 'real']).default('stub'),
  MAPBOX_TOKEN: z.string().optional(),

  CHECKIN_RADIUS_M: z.coerce.number().int().positive().default(100),
  CHECKIN_TTL_HOURS: z.coerce.number().positive().default(2),
  UNMATCH_SILENCE_DAYS: z.coerce.number().int().positive().default(14),
  ACCOUNT_PURGE_DAYS: z.coerce.number().int().positive().default(30),

  FEED_W_RECENCY: z.coerce.number().default(0.25),
  FEED_W_MUTUAL_INTERESTS: z.coerce.number().default(0.20),
  FEED_W_SAME_SPOT: z.coerce.number().default(0.20),
  FEED_W_DISTANCE: z.coerce.number().default(0.15),
  FEED_W_RECIPROCAL: z.coerce.number().default(0.15),
  FEED_W_RECENT_SHOWN_PENALTY: z.coerce.number().default(0.05),

  RL_OTP_PER_HOUR: z.coerce.number().int().default(5),
  RL_LIKES_PER_DAY: z.coerce.number().int().default(200),
  RL_CHECKINS_PER_5MIN: z.coerce.number().int().default(1),
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
