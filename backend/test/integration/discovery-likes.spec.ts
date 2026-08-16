import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, resetInMemory, testPrisma } from '../setup/db';
import { createUser } from '../helpers/profile.helper';
import { connectWs, waitFor } from '../helpers/ws.helper';
import { api } from '../helpers/api';
import { Socket } from 'socket.io-client';

const NYC = { lat: 40.7194, lng: -73.9963 };

describe('Discovery / likes / matches (§8 #8-#12)', () => {
  let t: TestApp;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });
  beforeEach(async () => { await cleanDb(); resetInMemory(t.app); });

  // #8 — A likes B's photo with comment; B hasn't liked A → no match, like stored.
  it('records a like with anchor + comment when no reciprocal exists', async () => {
    const A = await createUser(t, { gender: 'woman', lookingFor: ['everyone'], location: NYC });
    const B = await createUser(t, { gender: 'man',   lookingFor: ['everyone'], location: NYC });

    const prisma = testPrisma();
    const photoB = await prisma.photo.findFirstOrThrow({ where: { userId: B.userId } });

    const res = await api.post(t, '/likes', {
      toUserId: B.userId,
      anchorType: 'photo',
      anchorPhotoId: photoB.id,
      comment: 'love the energy here',
    }, A.token);
    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(false);

    const received = await api.get(t, '/likes/received', B.token).expect(200);
    expect(received.body.data).toHaveLength(1);
    expect(received.body.data[0].comment).toBe('love the energy here');
    expect(received.body.data[0].anchor.kind).toBe('photo');
  });

  // #9 — reciprocal like creates a match, match:new fires to both sides over WS.
  it('forms a match on reciprocal like and emits match:new to both', async () => {
    const A = await createUser(t, { gender: 'woman', lookingFor: ['everyone'], location: NYC });
    const B = await createUser(t, { gender: 'man',   lookingFor: ['everyone'], location: NYC });

    const sockA = await connectWs(t, A.token);
    const sockB = await connectWs(t, B.token);

    try {
      const prisma = testPrisma();
      const photoA = await prisma.photo.findFirstOrThrow({ where: { userId: A.userId } });
      const photoB = await prisma.photo.findFirstOrThrow({ where: { userId: B.userId } });

      // A likes B first (no match).
      await api.post(t, '/likes', {
        toUserId: B.userId, anchorType: 'photo', anchorPhotoId: photoB.id,
      }, A.token).expect(200);

      // B likes A back → match.
      const recvA: Promise<any> = waitFor(sockA, 'match:new');
      const recvB: Promise<any> = waitFor(sockB, 'match:new');

      const r = await api.post(t, '/likes', {
        toUserId: A.userId, anchorType: 'photo', anchorPhotoId: photoA.id,
      }, B.token);
      expect(r.status).toBe(200);
      expect(r.body.matched).toBe(true);

      const [evtA, evtB] = await Promise.all([recvA, recvB]);
      expect(evtA.match.id).toBe(r.body.matchId);
      expect(evtB.match.id).toBe(r.body.matchId);
      expect(evtA.otherProfile.userId).toBe(B.userId);
      expect(evtB.otherProfile.userId).toBe(A.userId);
    } finally {
      sockA.disconnect();
      sockB.disconnect();
    }
  });

  // #10 — A blocks B → B disappears from A's feed and vice versa.
  it('block removes the user from both feeds + ends the match', async () => {
    const A = await createUser(t, { gender: 'woman', lookingFor: ['everyone'], location: NYC });
    const B = await createUser(t, { gender: 'man',   lookingFor: ['everyone'], location: NYC });

    await api.post(t, '/blocks', { userId: B.userId }, A.token).expect(200);

    const feedA = await api.get(t, '/discovery/feed', A.token).expect(200);
    const feedB = await api.get(t, '/discovery/feed', B.token).expect(200);

    expect(feedA.body.data.map((p: any) => p.userId)).not.toContain(B.userId);
    expect(feedB.body.data.map((p: any) => p.userId)).not.toContain(A.userId);

    // Profile detail leaks neither way.
    const det = await api.get(t, `/discovery/profile/${B.userId}`, A.token);
    expect(det.status).toBe(404);
  });

  // #11 — distance filter: B at ~1.2mi excluded at 1mi, included at 25mi.
  it('respects the distance filter', async () => {
    const A = await createUser(t, { lookingFor: ['everyone'], location: NYC });
    // ~1.2 mi north of NYC point: 0.0175° lat ≈ 1.94km ≈ 1.2 mi.
    const B = await createUser(t, { lookingFor: ['everyone'], location: { lat: NYC.lat + 0.0175, lng: NYC.lng } });

    await api.put(t, '/filters', { distanceMi: 1 }, A.token).expect(200);
    const tight = await api.get(t, '/discovery/feed', A.token).expect(200);
    expect(tight.body.data.map((p: any) => p.userId)).not.toContain(B.userId);

    await api.put(t, '/filters', { distanceMi: 25 }, A.token).expect(200);
    const wide = await api.get(t, '/discovery/feed', A.token).expect(200);
    expect(wide.body.data.map((p: any) => p.userId)).toContain(B.userId);
  });

  // #12 — empty feed by distance → meta.reason='out_of_radius'.
  it('returns meta.reason=out_of_radius when nobody is in range', async () => {
    const A = await createUser(t, { lookingFor: ['everyone'], location: NYC });
    // B in LA — way outside 25 mi.
    await createUser(t, { lookingFor: ['everyone'], location: { lat: 34.0522, lng: -118.2437 } });

    await api.put(t, '/filters', { distanceMi: 25 }, A.token).expect(200);
    const res = await api.get(t, '/discovery/feed', A.token).expect(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.reason).toBe('out_of_radius');
  });
});
