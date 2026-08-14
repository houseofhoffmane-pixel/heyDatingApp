import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, flushTestRedis, testPrisma } from '../setup/db';
import { createUser, makeTestPlace } from '../helpers/profile.helper';
import { connectWs, waitFor } from '../helpers/ws.helper';
import { api } from '../helpers/api';

const NYC = { lat: 40.7194, lng: -73.9963 };

describe('Spots + check-ins (§8 #13-#18)', () => {
  let t: TestApp;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });
  beforeEach(async () => { await cleanDb(); await flushTestRedis(); });

  // #13 — within radius → check-in succeeds.
  it('accepts a check-in within 100m of the place', async () => {
    const user = await createUser(t, { location: NYC });
    const placeId = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    // ~80m offset: 0.00072° lat ≈ 80m.
    const res = await api.post(t, `/places/${placeId}/checkin`,
      { lat: NYC.lat + 0.00072, lng: NYC.lng }, user.token);
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });

  // #14 — outside radius → 422 TOO_FAR.
  it('rejects a check-in beyond 100m', async () => {
    const user = await createUser(t, { location: NYC });
    const placeId = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    // ~250m offset.
    const res = await api.post(t, `/places/${placeId}/checkin`,
      { lat: NYC.lat + 0.00225, lng: NYC.lng }, user.token);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('TOO_FAR');
  });

  // #15 — privacy gate: peopleHere null + locked:true unless you're here.
  it('only reveals peopleHere to a checked-in viewer', async () => {
    const viewer = await createUser(t, { location: NYC });
    const other  = await createUser(t, { location: NYC });
    const placeId = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    // Other user checks in first.
    await api.post(t, `/places/${placeId}/checkin`, NYC, other.token).expect(201);

    // Viewer hasn't checked in.
    const locked = await api.get(t, `/places/${placeId}`, viewer.token).expect(200);
    expect(locked.body.peopleHere).toBeNull();
    expect(locked.body.locked).toBe(true);
    expect(locked.body.hereCount).toBe(1);

    // Viewer checks in too.
    await api.post(t, `/places/${placeId}/checkin`, NYC, viewer.token).expect(201);

    const unlocked = await api.get(t, `/places/${placeId}`, viewer.token).expect(200);
    expect(unlocked.body.locked).toBe(false);
    expect(unlocked.body.peopleHere).toHaveLength(1);
    expect(unlocked.body.peopleHere[0].userId).toBe(other.userId);
  });

  // #16 — impossible jump trips the spoof guard.
  it('flags consecutive check-ins implying > 300 km/h', async () => {
    const user = await createUser(t, { location: NYC });
    const nyPlace = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    // Plant a prior check-in record in LA (very recent → high implied speed).
    const prisma = testPrisma();
    const laPlace = await makeTestPlace({ lat: 34.0522, lng: -118.2437 });
    await prisma.checkin.create({
      data: {
        userId: user.userId, placeId: laPlace,
        deviceLat: 34.0522, deviceLng: -118.2437,
        checkedInAt: new Date(Date.now() - 30 * 1000), // 30s ago
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        leftAt: new Date(Date.now() - 15 * 1000), // already left
      },
    });

    const res = await api.post(t, `/places/${nyPlace}/checkin`, NYC, user.token);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('SPOOF_DETECTED');
  });

  // #17 — auto-expiry: when expires_at lapses the cron expires the row.
  it('expires a check-in past expires_at and broadcasts the new count', async () => {
    const user = await createUser(t, { location: NYC });
    const placeId = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    await api.post(t, `/places/${placeId}/checkin`, NYC, user.token).expect(201);

    // Force-expire by rewriting expires_at, then directly call the worker.
    const prisma = testPrisma();
    await prisma.checkin.updateMany({
      where: { userId: user.userId, placeId, leftAt: null },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    // The cron is wired but we don't want to wait a minute — call the
    // service directly through the running app's DI container.
    const { CheckinService } = await import('../../src/modules/places/checkin.service');
    const svc = t.app.get(CheckinService);
    const result = await svc.expireDue();
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const det = await api.get(t, `/places/${placeId}`, user.token).expect(200);
    expect(det.body.hereCount).toBe(0);
  });

  // #18 — live count: three users check in → place:count fires three times.
  it('broadcasts place:count on every concurrent check-in', async () => {
    const viewer = await createUser(t, { location: NYC });
    const placeId = await makeTestPlace({ lat: NYC.lat, lng: NYC.lng });

    // Viewer joins the place room via the WS subscribe event (no checkin needed).
    const sock = await connectWs(t, viewer.token);
    sock.emit('subscribe:places', { placeIds: [placeId] });
    await new Promise((r) => setTimeout(r, 50)); // let the subscribe land

    const counts: number[] = [];
    sock.on('place:count', ({ count }) => counts.push(count));

    try {
      for (let i = 0; i < 3; i++) {
        const u = await createUser(t, { location: NYC });
        await api.post(t, `/places/${placeId}/checkin`, NYC, u.token).expect(201);
      }
      // give the gateway a moment to fan out.
      await new Promise((r) => setTimeout(r, 200));
      expect(counts.length).toBeGreaterThanOrEqual(3);
      expect(counts[counts.length - 1]).toBe(3);
    } finally {
      sock.disconnect();
    }
  });
});
