import { bootTestApp, closeTestApp, TestApp } from '../setup/test-app';
import { cleanDb, disconnectTestPrisma, resetInMemory, testPrisma } from '../setup/db';
import { createUser } from '../helpers/profile.helper';
import { connectWs, emit, waitFor } from '../helpers/ws.helper';
import { api } from '../helpers/api';
import { Socket } from 'socket.io-client';

const NYC = { lat: 40.7194, lng: -73.9963 };

describe('Chat / real-time (§8 #22-#25)', () => {
  let t: TestApp;
  let A: any, B: any, matchId: string;

  beforeAll(async () => { t = await bootTestApp(); });
  afterAll(async () => { await closeTestApp(t); await disconnectTestPrisma(); });

  beforeEach(async () => {
    await cleanDb();
    resetInMemory(t.app);
    A = await createUser(t, { lookingFor: ['everyone'], location: NYC });
    B = await createUser(t, { gender: 'man', lookingFor: ['everyone'], location: NYC });

    const prisma = testPrisma();
    const photoA = await prisma.photo.findFirstOrThrow({ where: { userId: A.userId } });
    const photoB = await prisma.photo.findFirstOrThrow({ where: { userId: B.userId } });
    await api.post(t, '/likes', { toUserId: B.userId, anchorType: 'photo', anchorPhotoId: photoB.id }, A.token);
    const r = await api.post(t, '/likes', { toUserId: A.userId, anchorType: 'photo', anchorPhotoId: photoA.id }, B.token);
    matchId = r.body.matchId;
  });

  // #22 — both online → message:new delivered instantly to the match room.
  it('delivers message:new instantly when both sockets are live', async () => {
    const sockA = await connectWs(t, A.token);
    const sockB = await connectWs(t, B.token);
    try {
      const heardOnB: Promise<any> = waitFor(sockB, 'message:new');
      const ack = await emit(sockA, 'message:send', {
        matchId, clientId: 'msg-1', body: 'hello!', kind: 'text',
      });
      expect(ack.ok).toBe(true);
      const msg = await heardOnB;
      expect(msg.body).toBe('hello!');
      expect(msg.senderId).toBe(A.userId);
    } finally {
      sockA.disconnect(); sockB.disconnect();
    }
  });

  // #23 — recipient offline → push is invoked via the stub provider.
  it('falls back to push when the recipient has no live socket', async () => {
    // Spy on the push provider by registering a device token + asserting
    // a notification row lands. The stub provider logs but doesn't error.
    const prisma = testPrisma();
    await prisma.deviceToken.create({
      data: { userId: B.userId, fcmToken: 'tkn-offline-B', platform: 'ios' },
    });

    await api.post(t, `/matches/${matchId}/messages`,
      { clientId: 'msg-off', body: 'ping while offline', kind: 'text' }, A.token).expect(201);

    const inbox = await prisma.notification.findMany({ where: { userId: B.userId, type: 'message.new' } });
    expect(inbox.length).toBeGreaterThanOrEqual(1);
    expect((inbox[0].payload as any).matchId).toBe(matchId);
  });

  // #24 — offline-retry: same clientId is deduped, no duplicate row.
  it('dedupes a retried send on the same clientId', async () => {
    await api.post(t, `/matches/${matchId}/messages`,
      { clientId: 'retry-1', body: 'first', kind: 'text' }, A.token).expect(201);

    const dup = await api.post(t, `/matches/${matchId}/messages`,
      { clientId: 'retry-1', body: 'first', kind: 'text' }, A.token);
    expect(dup.status).toBe(201);
    expect(dup.body.duplicate).toBe(true);

    const prisma = testPrisma();
    const count = await prisma.message.count({ where: { matchId, senderId: A.userId, clientId: 'retry-1' } });
    expect(count).toBe(1);
  });

  // #25 — typing relays only to the OTHER party's personal room.
  it('relays typing only to the other participant', async () => {
    const sockA = await connectWs(t, A.token);
    const sockB = await connectWs(t, B.token);
    try {
      const heardOnB: Promise<any> = waitFor(sockB, 'typing');
      let sawOnA = false;
      sockA.on('typing', () => { sawOnA = true; });

      await emit(sockA, 'typing:start', { matchId });

      const evt = await heardOnB;
      expect(evt.matchId).toBe(matchId);
      expect(evt.userId).toBe(A.userId);
      // Give the gateway a beat in case any echo would have fired.
      await new Promise((r) => setTimeout(r, 100));
      expect(sawOnA).toBe(false);
    } finally {
      sockA.disconnect(); sockB.disconnect();
    }
  });
});
