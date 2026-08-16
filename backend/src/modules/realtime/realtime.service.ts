import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { PresenceService } from './presence.service';

/**
 * Server-side emit facade. Feature modules (likes/matches, chat) inject
 * this to push events without knowing the Socket.IO server's API.
 *
 * Room naming convention is enforced here — change it once and every
 * caller stays in sync.
 */
@Injectable()
export class RealtimeService {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly presence: PresenceService,
  ) {}

  // ── targeted emits ───────────────────────────────────────────

  emitToUser<T>(userId: string, event: string, payload: T) {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToMatch<T>(matchId: string, event: string, payload: T) {
    this.gateway.server?.to(`match:${matchId}`).emit(event, payload);
  }

  // ── join helpers ─────────────────────────────────────────────

  async joinMatchForUser(userId: string, matchId: string) {
    const room = `match:${matchId}`;
    const sockets = await this.gateway.server.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) await s.join(room);
  }

  // ── presence read ────────────────────────────────────────────

  isUserOnline(userId: string): boolean {
    return this.presence.isOnline(userId);
  }
}
