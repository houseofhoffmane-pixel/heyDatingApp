import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, MessageKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { RateLimitService } from '../../common/ratelimit/ratelimit.service';
import { loadEnv } from '../../common/config/env';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

/**
 * The brains of chat. Reused by both REST (POST/GET routes) and WS (the
 * `message:send` / `message:read` handlers in ChatGateway).
 *
 * Hot paths:
 *   sendMessage  — insert (idempotent on clientId), bump match.lastMessageAt,
 *                  fan out `message:new` to the match room, and push-fallback
 *                  if the recipient is offline.
 *   listHistory  — cursor-paginated (by createdAt), newest first.
 *   markRead     — set read_at on every unread inbound message up to the
 *                  given cutoff, then emit `message:read` for the sender.
 *
 * Blocks are honored: a participant who has been blocked by the other side
 * gets 404 on send/list — we never reveal that the match was severed by a
 * block (only an unmatch surfaces a status).
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── send ─────────────────────────────────────────────────────

  async sendMessage(userId: string, matchId: string, dto: SendMessageDto) {
    const match = await this.requireParticipantMatch(userId, matchId);
    const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

    await this.guardBlock(userId, otherUserId);

    const env = loadEnv();
    const rl = await this.rateLimit.hit(`msg:min:${userId}`, env.RL_MESSAGES_PER_MIN, 60);
    if (!rl.allowed) {
      throw ApiError.tooManyRequests('MESSAGES_RATE_LIMITED', 'Slow down a bit.', rl.retryAfterSeconds);
    }

    const body = dto.body.trim();
    if (!body) throw ApiError.badRequest('EMPTY', 'Message can\'t be empty.');

    // Insert with idempotency. On unique-violation (matchId+sender+clientId)
    // return the row we already have — exactly what offline retry expects.
    let message;
    try {
      message = await this.prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          body,
          kind: dto.kind as MessageKind,
          status: MessageStatus.sent,
          clientId: dto.clientId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.message.findFirst({
          where: { matchId, senderId: userId, clientId: dto.clientId },
        });
        if (existing) {
          return { message: shapeMessage(existing, userId), duplicate: true };
        }
      }
      throw err;
    }

    // Update lastMessageAt so /matches sorts correctly.
    await this.prisma.match.update({
      where: { id: matchId },
      data: { lastMessageAt: message.createdAt },
    });

    // Fan out via WS to everyone in the match room (sender included — the
    // client can use this to reconcile optimistic state).
    const wireMessage = shapeMessage(message, null);
    this.realtime.emitToMatch(matchId, 'message:new', wireMessage);

    // Recipient-side flow: in-app row always; push only when offline (the
    // WS fan-out already covered live recipients).
    const recipientOnline = await this.realtime.isUserOnline(otherUserId);
    const senderProfile = await this.prisma.profile.findUnique({
      where: { userId }, select: { name: true },
    });
    await this.notifications.fanOut(
      otherUserId,
      'message.new',
      { matchId, messageId: message.id, senderId: userId, preview: body.slice(0, 80) },
      {
        // We already emitted `message:new` to the match room; don't double-notify the WS layer.
        skipRealtime: true,
        ...(recipientOnline
          ? {} // no push when online
          : {
              prefKey: 'notifyMessages',
              respectQuietHours: true,
              push: {
                title: senderProfile?.name ?? 'New message',
                body: body.slice(0, 140),
                data: { matchId, messageId: message.id, type: 'message.new' },
              },
            }),
      },
    ).catch((err) => this.logger.warn(`notifications.fanOut failed: ${err}`));

    return { message: shapeMessage(message, userId), duplicate: false };
  }

  // ── list history ─────────────────────────────────────────────

  async listHistory(userId: string, matchId: string, query: ListMessagesDto) {
    await this.requireParticipantMatch(userId, matchId);

    const where: Prisma.MessageWhereInput = { matchId };
    if (query.cursor) {
      const parsed = new Date(query.cursor);
      if (Number.isNaN(parsed.getTime())) {
        throw ApiError.badRequest('CURSOR_INVALID', 'Bad cursor.');
      }
      where.createdAt = { lt: parsed };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    const oldest = messages[messages.length - 1];
    return {
      data: messages.map((m) => shapeMessage(m, userId)),
      meta: {
        cursor: messages.length === query.limit && oldest ? oldest.createdAt.toISOString() : null,
      },
    };
  }

  // ── mark read ────────────────────────────────────────────────

  async markRead(userId: string, matchId: string, upToMessageId?: string) {
    const match = await this.requireParticipantMatch(userId, matchId);
    const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

    let cutoff: Date | undefined;
    if (upToMessageId) {
      const upTo = await this.prisma.message.findUnique({
        where: { id: upToMessageId },
        select: { matchId: true, createdAt: true },
      });
      if (!upTo || upTo.matchId !== matchId) {
        throw ApiError.badRequest('MESSAGE_NOT_IN_MATCH', 'Message isn\'t in this match.');
      }
      cutoff = upTo.createdAt;
    }

    const where: Prisma.MessageWhereInput = {
      matchId,
      senderId: otherUserId,
      readAt: null,
    };
    if (cutoff) where.createdAt = { lte: cutoff };

    const result = await this.prisma.message.updateMany({
      where,
      data: { status: MessageStatus.read, readAt: new Date() },
    });

    if (result.count > 0) {
      this.realtime.emitToUser(otherUserId, 'message:read', {
        matchId,
        upToMessageId: upToMessageId ?? null,
        readAt: new Date().toISOString(),
        readBy: userId,
      });
    }

    return { ok: true, count: result.count };
  }

  // ── typing relay (no DB) ─────────────────────────────────────

  async relayTyping(userId: string, matchId: string, state: 'start' | 'stop') {
    const match = await this.requireParticipantMatch(userId, matchId);
    const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
    // Send to the other user's personal room only — not the whole match
    // room, since the sender doesn't need to see their own indicator.
    this.realtime.emitToUser(otherUserId, 'typing', { matchId, userId, state });
  }

  // ── helpers ──────────────────────────────────────────────────

  /**
   * Loads the match and verifies userId is a participant *and* the match is
   * active. Throws 404 for non-participants so we don't leak match ids.
   */
  private async requireParticipantMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw ApiError.notFound('MATCH_NOT_FOUND', 'Match not found.');
    }
    if (match.status === MatchStatus.unmatched) {
      throw ApiError.forbidden('UNMATCHED', 'This match has ended.');
    }
    return match;
  }

  private async guardBlock(userA: string, userB: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    if (block) throw ApiError.notFound('MATCH_NOT_FOUND', 'Match not found.');
  }
}

// ─────────────────────────────────────────────────────────────
// Wire shape — `fromMe` is included when we know the viewer; null
// means the consumer (a broadcast to the match room) will resolve it
// per recipient on the client.
// ─────────────────────────────────────────────────────────────

function shapeMessage(m: { id: string; matchId: string; senderId: string; body: string; kind: any; status: any; readAt: Date | null; createdAt: Date; clientId: string }, viewerId: string | null) {
  return {
    id: m.id,
    matchId: m.matchId,
    senderId: m.senderId,
    body: m.body,
    kind: m.kind,
    status: m.status,
    clientId: m.clientId,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    fromMe: viewerId ? m.senderId === viewerId : null,
  };
}
