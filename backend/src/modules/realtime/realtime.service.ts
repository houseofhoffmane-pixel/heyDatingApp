import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Server-side emit facade. Feature modules (likes/matches in Step 6,
 * chat in Step 7, places in Step 8) inject this to push events without
 * having to know the Socket.IO server's API.
 *
 * Room naming convention is enforced here — change it once and every
 * caller stays in sync.
 */
@Injectable()
export class RealtimeService {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly redis: RedisService,
  ) {}

  // ── targeted emits ───────────────────────────────────────────

  emitToUser<T>(userId: string, event: string, payload: T) {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToMatch<T>(matchId: string, event: string, payload: T) {
    this.gateway.server?.to(`match:${matchId}`).emit(event, payload);
  }

  emitToPlace<T>(placeId: string, event: string, payload: T) {
    this.gateway.server?.to(`place:${placeId}`).emit(event, payload);
  }

  emitToEvent<T>(eventId: string, event: string, payload: T) {
    this.gateway.server?.to(`event:${eventId}`).emit(event, payload);
  }

  // ── join/leave helpers (used by post-connect lifecycle in step 8) ─

  async joinPlaceForUser(userId: string, placeId: string) {
    const room = `place:${placeId}`;
    const sockets = await this.gateway.server.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) await s.join(room);
  }

  async leavePlaceForUser(userId: string, placeId: string) {
    const room = `place:${placeId}`;
    const sockets = await this.gateway.server.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) await s.leave(room);
  }

  async joinMatchForUser(userId: string, matchId: string) {
    const room = `match:${matchId}`;
    const sockets = await this.gateway.server.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) await s.join(room);
  }

  // ── presence read (used by steps 7+) ─────────────────────────

  async isUserOnline(userId: string): Promise<boolean> {
    const n = await this.redis.client.scard(`presence:${userId}`);
    return n > 0;
  }
}
