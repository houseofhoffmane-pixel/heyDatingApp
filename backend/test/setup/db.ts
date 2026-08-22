import { PrismaClient } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import { RateLimitService } from '../../src/common/ratelimit/ratelimit.service';
import { PresenceService } from '../../src/modules/realtime/presence.service';
import { FeedShownService } from '../../src/modules/discovery/feed-shown.service';

/**
 * Mutable tables — these get TRUNCATED before each test so state from one
 * scenario can't leak into the next. Catalog tables (interests, prompts,
 * feed_config) survive because globalSetup seeded them and the tests use
 * them as fixtures.
 *
 * `TRUNCATE ... RESTART IDENTITY CASCADE` is one round-trip and clears
 * downstream FKs in dependency order automatically.
 */
const MUTABLE_TABLES = [
  'messages',
  'matches',
  'likes',
  'passes',
  'reports',
  'blocks',
  'notifications',
  'device_tokens',
  'linked_accounts',
  'emergency_contacts',
  'photos',
  'profile_prompts',
  'profile_interests',
  'filters',
  'user_settings',
  'refresh_tokens',
  'otp_attempts',
  'profiles',
  'users',
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
  // Restore feed_config defaults — singleton row that's modified by ranking tests.
  await prisma.feedConfig.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {
      wRecency: 0.30, wMutualInterests: 0.25,
      wDistance: 0.20, wReciprocal: 0.20, wRecentlyShownPenalty: 0.05,
    },
  });
}

/**
 * Wipe every in-memory service that used to be Redis-backed (rate limits,
 * presence, feed-shown). Sprint 2 replaced Redis with in-process Maps;
 * this is the equivalent of `FLUSHDB` between specs.
 */
export function resetInMemory(app: INestApplication) {
  app.get(RateLimitService).resetAll();
  app.get(PresenceService).resetAll();
  app.get(FeedShownService).resetAll();
}
