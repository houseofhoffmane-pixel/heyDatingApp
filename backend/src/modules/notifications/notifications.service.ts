import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { RealtimeService } from '../realtime/realtime.service';
import { PushService } from '../push/push.service';
import { ListNotificationsDto, MarkNotificationsReadDto } from './dto/list-notifications.dto';

type PrefKey =
  | 'notifyMatches'
  | 'notifyMessages'
  | 'notifyLikes'
  | 'notifyPlaces'
  | 'notifyEvents'
  | 'notifyNews';

interface FanOutOptions {
  prefKey?: PrefKey;
  respectQuietHours?: boolean;
  push?: { title: string; body: string; data?: Record<string, string> };
  /** Skip the realtime emit (e.g. when the originating service already emitted). */
  skipRealtime?: boolean;
}

/**
 * Central facade for creating + delivering a notification.
 *
 * Every feature module that has a trigger calls `fanOut()` rather than
 * touching the `notifications` table or `PushService` directly. That gives
 * us one place to:
 *   - drop the in-app row (always)
 *   - emit `notification:new` over WS to the user's personal room
 *   - call `PushService.sendToUser` (gated by preferences + quiet hours)
 *
 * The "do all three" pattern is the contract Step 7 (chat), Step 6 (likes),
 * Step 4 (verification), Step 8 (match-at-spot), and the event reminder
 * cron (this module) all share.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  // ── creation + fan-out ───────────────────────────────────────

  async fanOut(userId: string, type: string, payload: Record<string, unknown>, opts: FanOutOptions = {}) {
    const row = await this.prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    });

    if (!opts.skipRealtime) {
      this.realtime.emitToUser(userId, 'notification:new', {
        id: row.id,
        type: row.type,
        payload: row.payload,
        createdAt: row.createdAt.toISOString(),
      });
    }

    if (opts.push) {
      await this.push.sendToUser(
        userId,
        { title: opts.push.title, body: opts.push.body, data: opts.push.data },
        { prefKey: opts.prefKey, respectQuietHours: opts.respectQuietHours },
      ).catch(() => undefined);
    }

    return row;
  }

  /** Drop the in-app row only; used when the caller already pushed manually. */
  async record(userId: string, type: string, payload: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    });
  }

  // ── REST: list + read ────────────────────────────────────────

  async list(userId: string, dto: ListNotificationsDto) {
    const cursor = dto.cursor ? new Date(dto.cursor) : null;
    if (dto.cursor && Number.isNaN(cursor?.getTime() ?? NaN)) {
      throw ApiError.badRequest('CURSOR_INVALID', 'Bad cursor.');
    }

    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(dto.unreadOnly ? { read: false } : {}),
        ...(cursor ? { createdAt: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit + 1,
    });

    const hasMore = rows.length > dto.limit;
    const page = hasMore ? rows.slice(0, dto.limit) : rows;

    const unread = await this.prisma.notification.count({ where: { userId, read: false } });

    return {
      data: page.map((r) => ({
        id: r.id,
        type: r.type,
        payload: r.payload,
        read: r.read,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        cursor: hasMore && page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null,
        unreadTotal: unread,
      },
    };
  }

  async markRead(userId: string, dto: MarkNotificationsReadDto) {
    let cutoff: Date | undefined;
    if (dto.upToId) {
      const row = await this.prisma.notification.findUnique({ where: { id: dto.upToId } });
      if (!row || row.userId !== userId) {
        throw ApiError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found.');
      }
      cutoff = row.createdAt;
    }

    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        ...(cutoff ? { createdAt: { lte: cutoff } } : {}),
      },
      data: { read: true },
    });

    return { ok: true, count: result.count };
  }
}
