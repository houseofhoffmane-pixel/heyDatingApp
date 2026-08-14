import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, flushTestRedis, testPrisma } from '../setup/db';
import { createUser, makeTestEvent } from '../helpers/profile.helper';
import { api } from '../helpers/api';

const NYC = { lat: 40.7194, lng: -73.9963 };

describe('Events + RSVP (§8 #19-#21)', () => {
  let t: TestApp;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });
  beforeEach(async () => { await cleanDb(); await flushTestRedis(); });

  // #19 — RSVP early; check-in disabled (status 422 EVENT_NOT_STARTED) before window.
  it('counts an RSVP and blocks check-in until the window opens', async () => {
    const user = await createUser(t, { location: NYC });
    const eventId = await makeTestEvent({
      lat: NYC.lat, lng: NYC.lng,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 27 * 60 * 60 * 1000),
    });

    await api.post(t, `/events/${eventId}/rsvp`, {}, user.token).expect(200);

    const detail = await api.get(t, `/events/${eventId}`, user.token).expect(200);
    expect(detail.body.goingCount).toBe(1);
    expect(detail.body.iRsvpd).toBe(true);
    expect(detail.body.checkinOpen).toBe(false);

    const tooEarly = await api.post(t, `/events/${eventId}/checkin`, NYC, user.token);
    expect(tooEarly.status).toBe(422);
    expect(tooEarly.body.error.code).toBe('EVENT_NOT_STARTED');
  });

  // #20 — during window AND within 100m → check-in succeeds.
  it('accepts event check-in inside the window AND within 100m', async () => {
    const user = await createUser(t, { location: NYC });
    const eventId = await makeTestEvent({
      lat: NYC.lat, lng: NYC.lng,
      startsAt: new Date(Date.now() - 30 * 60 * 1000),   // started 30 min ago
      endsAt: new Date(Date.now() + 90 * 60 * 1000),     // ends in 90 min
    });
    await api.post(t, `/events/${eventId}/rsvp`, {}, user.token).expect(200);

    const res = await api.post(t, `/events/${eventId}/checkin`, NYC, user.token);
    expect(res.status).toBe(201);
    expect(res.body.eventId).toBe(eventId);
  });

  // #21 — matchesGoing only contains the requester's matches/likes.
  it('lists only matches/likes as matchesGoing for the requester', async () => {
    const viewer  = await createUser(t, { lookingFor: ['everyone'], location: NYC });
    const matched = await createUser(t, { gender: 'man', lookingFor: ['everyone'], location: NYC });
    const stranger = await createUser(t, { gender: 'man', lookingFor: ['everyone'], location: NYC });

    // Force a match (mutual likes) between viewer and `matched`.
    const prisma = testPrisma();
    const photoMatched = await prisma.photo.findFirstOrThrow({ where: { userId: matched.userId } });
    const photoViewer  = await prisma.photo.findFirstOrThrow({ where: { userId: viewer.userId } });
    await api.post(t, '/likes', { toUserId: matched.userId, anchorType: 'photo', anchorPhotoId: photoMatched.id }, viewer.token).expect(200);
    const r = await api.post(t, '/likes', { toUserId: viewer.userId, anchorType: 'photo', anchorPhotoId: photoViewer.id }, matched.token).expect(200);
    expect(r.body.matched).toBe(true);

    const eventId = await makeTestEvent({
      lat: NYC.lat, lng: NYC.lng,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
    });
    await api.post(t, `/events/${eventId}/rsvp`, {}, matched.token).expect(200);
    await api.post(t, `/events/${eventId}/rsvp`, {}, stranger.token).expect(200);

    const detail = await api.get(t, `/events/${eventId}`, viewer.token).expect(200);
    expect(detail.body.goingCount).toBe(2);
    const ids = detail.body.matchesGoing.map((p: any) => p.userId);
    expect(ids).toContain(matched.userId);
    expect(ids).not.toContain(stranger.userId);
  });
});
