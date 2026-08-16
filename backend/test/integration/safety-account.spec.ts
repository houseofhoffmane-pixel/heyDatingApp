import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, resetInMemory, testPrisma } from '../setup/db';
import { createUser } from '../helpers/profile.helper';
import { api } from '../helpers/api';

const NYC = { lat: 40.7194, lng: -73.9963 };

describe('Safety / account lifecycle (§8 #26-#29)', () => {
  let t: TestApp;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });
  beforeEach(async () => { await cleanDb(); resetInMemory(t.app); });

  // #26 — report with 4-char detail → 422 DETAIL_REQUIRED (the DTO catches it first).
  it('rejects a report whose detail is shorter than 10 chars', async () => {
    const A = await createUser(t, { location: NYC });
    const B = await createUser(t, { location: NYC });

    const short = await api.post(t, '/reports', {
      targetType: 'profile', targetId: B.userId, reason: 'fake', detail: 'fake',
    }, A.token);
    expect(short.status).toBe(400);

    const ok = await api.post(t, '/reports', {
      targetType: 'profile', targetId: B.userId, reason: 'fake', detail: 'photos look AI generated',
    }, A.token);
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('pending');
  });

  // #27 — paused and hidden statuses remove the user from discovery.
  it('paused and hidden statuses remove the user from discovery', async () => {
    const viewer = await createUser(t, { lookingFor: ['everyone'], location: NYC });
    const target = await createUser(t, { gender: 'man', lookingFor: ['everyone'], location: NYC });

    // active baseline: present in feed.
    const before = await api.get(t, '/discovery/feed', viewer.token).expect(200);
    expect(before.body.data.map((p: any) => p.userId)).toContain(target.userId);

    // paused: status is no longer 'active' → discovery filter excludes.
    await api.put(t, '/account/status', { status: 'paused' }, target.token).expect(200);
    const paused = await api.get(t, '/discovery/feed', viewer.token).expect(200);
    expect(paused.body.data.map((p: any) => p.userId)).not.toContain(target.userId);

    // hidden: same exclusion.
    await api.put(t, '/account/status', { status: 'hidden' }, target.token).expect(200);
    const hidden = await api.get(t, '/discovery/feed', viewer.token).expect(200);
    expect(hidden.body.data.map((p: any) => p.userId)).not.toContain(target.userId);
  });

  // #28 — delete: soft-delete sets deleted_at + status='deleted', revokes refresh tokens.
  it('soft-deletes the account and kicks every session', async () => {
    const user = await createUser(t, { location: NYC });

    await api.delete(t, '/account', user.token).expect(200);

    const prisma = testPrisma();
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    expect(row.status).toBe('deleted');
    expect(row.deletedAt).not.toBeNull();

    // Refresh token revoked.
    const refresh = await api.post(t, '/auth/refresh', { refreshToken: user.refreshToken });
    expect(refresh.status).toBe(401);
  });

  // #29 — auto-resume cron flips paused → active when autoResumeAt passes.
  it('auto-resumes a paused user whose autoResumeAt is in the past', async () => {
    const user = await createUser(t, { location: NYC });

    // Pause with autoResumeAt 1 hour in the future, then back-date it via DB.
    await api.put(t, '/account/status', {
      status: 'paused', autoResumeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }, user.token).expect(200);

    const prisma = testPrisma();
    await prisma.user.update({
      where: { id: user.userId },
      data: { autoResumeAt: new Date(Date.now() - 60 * 1000) },
    });

    // Invoke the cron directly through DI.
    const { AutoResumeProcessor } = await import('../../src/modules/me/jobs/auto-resume.processor');
    const job = t.app.get(AutoResumeProcessor);
    await job.run();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    expect(after.status).toBe('active');
    expect(after.autoResumeAt).toBeNull();
  });
});
