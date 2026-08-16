import { PhotoStatus, UserStatus } from '@prisma/client';
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
 * like a production-onboarded account, then flip status to `active`.
 * Face verification was removed from the ship-scope onboarding flow
 * (Sprint 1) — photos are still required, but there is no selfie
 * step and no BullMQ queue to bypass.
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

  // 7) Flip to active (no verification step in ship-scope).
  await prisma.user.update({
    where: { id: user.id },
    data: { status: UserStatus.active },
  });

  return { userId: user.id, token: accessToken, refreshToken, phone, name, gender };
}

export function expectStatus(res: { status: number; body: any }, expected: number) {
  if (res.status !== expected) {
    throw new Error(
      `expected ${expected}, got ${res.status}\nbody: ${JSON.stringify(res.body, null, 2)}`,
    );
  }
}
