import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, Socket } from 'socket.io';
import { TokensService } from '../auth/tokens.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Realtime gateway — single Socket.IO namespace `/rt`.
 *
 * Auth: client sends the access token in the handshake
 *   const sock = io('/rt', { auth: { token } })
 * If verification fails the connection is closed before any room work.
 *
 * Rooms a socket auto-joins on connect:
 *   - user:<id>     personal — match:new, presence updates, system pings
 *   - match:<id>    one per active match — message:new, typing, message:read
 *   - place:<id>    if currently checked in (Step 8)
 *   - event:<id>    if currently checked in (Step 9)
 *
 * Presence: a Redis SET `presence:<userId>` holds the live socket IDs.
 * Non-empty ⇒ online. Cleared on disconnect.
 *
 * Redis adapter: pub + sub clients are duplicated off the main connection
 * so room messages fan out across multiple gateway instances.
 */
@WebSocketGateway({
  namespace: '/rt',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────

  async afterInit(server: Server) {
    const pub = this.redis.duplicate();
    const sub = this.redis.duplicate();
    server.adapter(createAdapter(pub, sub));

    // Authenticate on the *raw* connection (before handleConnection), so
    // we never accept a socket without a valid token.
    server.use(async (socket, next) => {
      try {
        const token =
          (socket.handshake.auth as any)?.token ||
          (socket.handshake.query as any)?.token ||
          extractBearer(socket.handshake.headers.authorization as string | undefined);
        if (!token) return next(new Error('AUTH_REQUIRED'));
        const payload = this.tokens.verifyAccessToken(String(token));
        (socket.data as any).userId = payload.sub;
        next();
      } catch (err: any) {
        next(new Error(err?.message || 'AUTH_INVALID'));
      }
    });
  }

  async onModuleDestroy() {
    this.server?.close();
  }

  // ── Connect / disconnect ─────────────────────────────────────

  async handleConnection(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return socket.disconnect(true);

    await socket.join(`user:${userId}`);
    await this.joinActiveMatches(socket, userId);

    // Presence: SADD this socket's id; refresh TTL so dropped clients age out.
    await this.redis.client.sadd(`presence:${userId}`, socket.id);
    await this.redis.client.expire(`presence:${userId}`, 90);

    this.logger.debug(`connect ${socket.id} → user=${userId}`);
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    await this.redis.client.srem(`presence:${userId}`, socket.id);
    this.logger.debug(`disconnect ${socket.id} → user=${userId}`);
  }

  // ── Internal helpers (server-side emit lives in RealtimeService) ─

  private async joinActiveMatches(socket: Socket, userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });
    await Promise.all(matches.map((m) => socket.join(`match:${m.id}`)));
  }
}

function extractBearer(authHeader?: string): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  return m ? m[1] : null;
}
