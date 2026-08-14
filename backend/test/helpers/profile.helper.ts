import { PhotoStatus, UserStatus, VerificationStatus } from '@prisma/client';
import { testPrisma } from '../setup/db';
import { api } from './api';
import type { TestApp } from '../setup/test-app';

let _seq = 0;
function nextPhone() {
  _seq++;
  // E.164: +1 555 010 XXXX. Wraps at 9999 — re-use is fine because cleanDb
  // truncates between tests, but this guards against same-test collisions.
  return `+1555010${String(_seq).padStart(4, '0')}`;
}

export interface TestUser {
  userId: string;
  token: string;
  refreshToken: string;
  phone: string;
  name: string;
  gender: 'woman' | 'man' | 'non_binary';
}

/**
 * Walk the real onboarding API end-to-end so the user behaves exactly
 * like a production-onboarded account. The final step *bypasses* the
 * face-match queue and flips the verification + user.status directly so
 * tests don't have to wait on BullMQ.
 *
 * Pass `{ skipVerification: true }` to leave the account in
 * `pending_verification` for negative-path tests.
 */
export async function createUser(
  t: TestApp,
  opts: Partial<{
    name: string;
    age: number;
    gender: 'woman' | 'man' | 'non_binary';
    lookingFor: ('women' | 'men' | 'non-binary' | 'everyone')[];
    bio: string;
    location: { lat: number; lng: number };
    skipVerification: boolean;
  }> = {},
): Promise<TestUser> {
  const phone = nextPhone();
  const name = opts.name ?? `Test${_seq}`;
  const age = opts.age ?? 25;
  const gender = opts.gender ?? 'woman';
  const lookingFor = opts.lookingFor ?? ['everyone'];
  const bio = opts.bio ?? 'Looking for someone to grab coffee with after work.';

  // 1) OTP
  await api.post(t, '/auth/otp/request', { phone_e164: phone }).expect(200);
  const verify = await api.post(t, '/auth/otp/verify', { phone_e164: phone, code: '123456' });
  expectStatus(verify, 200);
  const { accessToken, refreshToken, user } = verify.body;

  // 2) Name + DOB + 18+ confirm
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  await api.patch(t, '/onboarding/profile', {
    name,
    dob: dob.toISOString().slice(0, 10),
    ageConfirmed: true,
    gender,
    lookingFor,
    relationshipIntent: 'figuring_out',
    heightCm: 170,
    bio,
  }, accessToken).expect(200);

  // 3) 3 interests
  const prisma = testPrisma();
  const interests = await prisma.interest.findMany({ take: 3 });
  await api.post(t, '/onboarding/interests', { interest_ids: interests.map((i) => i.id) }, accessToken).expect(200);

  // 4) 1 prompt
  const prompts = await prisma.prompt.findMany({ take: 1 });
  await api.post(t, '/onboarding/prompts', {
    items: [{ prompt_id: prompts[0].id, answer: 'something specific about myself.' }],
  }, accessToken).expect(200);

  // 5) 2 photos — bypass the upload flow with direct DB inserts.
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.photo.createMany({
    data: [
      { profileId: profile.id, userId: user.id, s3Key: `photos/${user.id}-0.jpg`, position: 0, isMain: true,  status: PhotoStatus.approved },
      { profileId: profile.id, userId: user.id, s3Key: `photos/${user.id}-1.jpg`, position: 1, isMain: false, status: PhotoStatus.approved },
    ],
  });

  // 6) Location — needed before discovery works.
  if (opts.location) {
    await api.put(t, '/me/location', opts.location, accessToken).expect(200);
  }

  // 7) Verification — direct DB flip (bypass the async worker).
  if (!opts.skipVerification) {
    await prisma.verification.create({
      data: {
        userId: user.id,
        selfieS3Key: `selfies/${user.id}.jpg`,
        status: VerificationStatus.approved,
        matchConfidence: 95,
        attempt: 1,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.active },
    });
  }

  return { userId: user.id, token: accessToken, refreshToken, phone, name, gender };
}

export function expectStatus(res: { status: number; body: any }, expected: number) {
  if (res.status !== expected) {
    throw new Error(
      `expected ${expected}, got ${res.status}\nbody: ${JSON.stringify(res.body, null, 2)}`,
    );
  }
}

/** Seed a place with explicit coordinates. */
export async function makeTestPlace(opts: { label?: string; lat: number; lng: number; kind?: string }) {
  const prisma = testPrisma();
  // Need a city to satisfy the FK — reuse the NYC seed.
  const city = await prisma.city.findFirstOrThrow();
  const inserted = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "places" ("label","kind","vibe","address","icon","tone","hot","city_id","location")
    VALUES (${opts.label ?? 'Test Spot'}, ${opts.kind ?? 'coffee'}, 'test',
            'test address', 'coffee', 'peach', false, ${city.id}::uuid,
            ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography)
    RETURNING "id"
  `;
  return inserted[0].id;
}

/** Seed an event with explicit coordinates and time window. */
export async function makeTestEvent(opts: {
  title?: string;
  lat: number; lng: number;
  startsAt: Date; endsAt: Date;
  placeId?: string | null;
}) {
  const prisma = testPrisma();
  const city = await prisma.city.findFirstOrThrow();
  const inserted = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "events"
      ("title","host","vibe","place_id","starts_at","ends_at","door_text","cover_text",
       "city_id","tags","icon","tone","hot","location")
    VALUES
      (${opts.title ?? 'Test Event'}, 'host', 'vibe',
       ${opts.placeId ?? null}::uuid,
       ${opts.startsAt}::timestamptz, ${opts.endsAt}::timestamptz,
       'when', 'free', ${city.id}::uuid, '{}'::text[], 'music', 'sky', false,
       ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography)
    RETURNING "id"
  `;
  return inserted[0].id;
}
