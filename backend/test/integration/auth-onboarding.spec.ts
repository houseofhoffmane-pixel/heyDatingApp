import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, flushTestRedis } from '../setup/db';
import { createUser } from '../helpers/profile.helper';
import { api } from '../helpers/api';

describe('Onboarding / Auth (§8 #1-#4)', () => {
  let t: TestApp;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });
  beforeEach(async () => { await cleanDb(); await flushTestRedis(); });

  // #1
  it('rejects DOB making the user 17 with 422 UNDERAGE', async () => {
    await api.post(t, '/auth/otp/request', { phone_e164: '+15550101111' }).expect(200);
    const v = await api.post(t, '/auth/otp/verify', { phone_e164: '+15550101111', code: '123456' }).expect(200);
    const token = v.body.accessToken;

    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 17);
    const res = await api.patch(t, '/onboarding/profile', {
      dob: dob.toISOString().slice(0, 10),
      ageConfirmed: true,
    }, token);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNDERAGE');
  });

  // #2 — ageConfirmed=false blocks activation (patch itself succeeds).
  it('blocks activation when ageConfirmed is false', async () => {
    await api.post(t, '/auth/otp/request', { phone_e164: '+15550102222' }).expect(200);
    const v = await api.post(t, '/auth/otp/verify', { phone_e164: '+15550102222', code: '123456' }).expect(200);
    const token = v.body.accessToken;

    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 25);
    await api.patch(t, '/onboarding/profile', {
      dob: dob.toISOString().slice(0, 10),
      ageConfirmed: false,                   // ← the rule under test
      name: 'Joy', gender: 'woman',
      lookingFor: ['everyone'], relationshipIntent: 'figuring_out',
      heightCm: 170, bio: 'a bio that\'s plenty long for the rule.',
    }, token).expect(200);

    const state = await api.get(t, '/onboarding/state', token).expect(200);
    expect(state.body.completeness.satisfied.ageConfirmed).toBe(false);
    expect(state.body.completeness.missing).toContain('ageConfirmed');
    expect(state.body.canActivate).toBe(false);
  });

  // #3 — wrong OTP returns OTP_INVALID, 5 fails locks the phone.
  it('returns OTP_INVALID on a bad code and locks out after 5 fails', async () => {
    const phone = '+15550103333';
    await api.post(t, '/auth/otp/request', { phone_e164: phone }).expect(200);

    for (let i = 0; i < 4; i++) {
      const r = await api.post(t, '/auth/otp/verify', { phone_e164: phone, code: '999999' });
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('OTP_INVALID');
    }
    const fifth = await api.post(t, '/auth/otp/verify', { phone_e164: phone, code: '999999' });
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe('OTP_LOCKED');

    // Correct code is also rejected during lockout.
    const correct = await api.post(t, '/auth/otp/verify', { phone_e164: phone, code: '123456' });
    expect(correct.status).toBe(429);
  });

  // #4 — sparse profile: optional fields are omitted from the response (the null-omit rule).
  it('omits null optional fields from /me', async () => {
    const u = await createUser(t, { location: { lat: 40.7194, lng: -73.9963 } });
    const me = await api.get(t, '/me', u.token).expect(200);

    // Required keys are present
    expect(me.body.name).toBeTruthy();
    expect(me.body.gender).toBeTruthy();
    // Optional keys NOT set must be absent (not null)
    expect('job' in me.body).toBe(false);
    expect('school' in me.body).toBe(false);
    expect('starSign' in me.body).toBe(false);
    expect('drinks' in me.body).toBe(false);
  });
});
