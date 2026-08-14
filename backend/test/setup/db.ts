import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

/**
 * Mutable tables — these get TRUNCATED before each test so state from one
 * scenario can't leak into the next. Catalog tables (interests, prompts,
 * cities, places, events, admin_users, feed_config) survive because
 * globalSetup seeded them and the tests use them as fixtures.
 *
 * `TRUNCATE ... RESTART IDENTITY CASCADE` is one round-trip and clears
 * downstream FKs in dependency order automatically.
 */
const MUTABLE_TABLES = [
  'messages',
  'matches',
  'likes',
  'passes',
  'event_rsvps',
  'saved_events',
  'saved_spots',
  'place_requests',
  'checkins',
  'reports',
  'blocks',
  'notifications',
  'device_tokens',
  'linked_accounts',
  'emergency_contacts',
  'verifications',
  'photos',
  'profile_prompts',
  'profile_interests',
  'filters',
  'user_settings',
  'refresh_tokens',
  'otp_attempts',
  'profiles',
  'users',
  'admin_audit',
];

/** One Prisma instance per test process — created lazily on first use. */
let _prisma: PrismaClient | null = null;

export function testPrisma(): PrismaClient {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export async function disconnectTestPrisma() {
  await _prisma?.$disconnect();
  _prisma = null;
}

export async function cleanDb() {
  const prisma = testPrisma();
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${MUTABLE_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  // Restore feed_config defaults — singleton row that's modified by Step 12 tests.
  await prisma.feedConfig.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {
      wRecency: 0.25, wMutualInterests: 0.20, wSameSpot: 0.20,
      wDistance: 0.15, wReciprocal: 0.15, wRecentlyShownPenalty: 0.05,
    },
  });
}

/** Flush the Redis namespace used by .env.test so rate limits / presence reset. */
export async function flushTestRedis() {
  const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  try {
    await redis.flushdb();
  } finally {
    redis.disconnect();
  }
}
