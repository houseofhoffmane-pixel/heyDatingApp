import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { NotificationsService } from '../notifications.service';

/**
 * Pushes a reminder ~2 hours before each saved / RSVP'd event.
 *
 * Cron fires every 5 minutes. We pick events starting in the window
 * `[now + 1h55m, now + 2h05m]` and notify each RSVP'd or save'd user — but
 * only once: idempotency is enforced by checking for an existing
 * `notifications` row with type='event.reminder' + payload.eventId=…
 * (we read the JSONB field via raw SQL since Prisma's JSON filter is
 * awkward across providers).
 *
 * Multi-instance safe via the same SET NX EX lock pattern as the check-in
 * cron — only one leader fires per tick.
 */
@Injectable()
export class EventReminderProcessor {
  private readonly logger = new Logger(EventReminderProcessor.name);
  private readonly LOCK_KEY = 'cron:event-reminder';
  private readonly LOCK_TTL_S = 270; // 4m30s > cron interval (5m)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async run() {
    const got = await this.redis.client.set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL_S, 'NX');
    if (got !== 'OK') return;

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + 1 * 60 * 60 * 1000 + 55 * 60 * 1000); // +1h55
      const windowEnd   = new Date(now.getTime() + 2 * 60 * 60 * 1000 +  5 * 60 * 1000); // +2h05

      const events = await this.prisma.event.findMany({
        where: {
          active: true,
          startsAt: { gte: windowStart, lte: windowEnd },
        },
        select: { id: true, title: true, startsAt: true, doorText: true, host: true },
      });
      if (events.length === 0) return;

      for (const event of events) {
        // Everyone going (RSVP=going) OR who saved it.
        const userIds = await this.prisma.$queryRaw<{ user_id: string }[]>`
          SELECT DISTINCT user_id FROM (
            SELECT user_id FROM event_rsvps WHERE event_id = ${event.id}::uuid AND status = 'going'
            UNION
            SELECT user_id FROM saved_events WHERE event_id = ${event.id}::uuid
          ) z
        `;
        if (userIds.length === 0) continue;

        // Skip users we already reminded for this event.
        const alreadySent = await this.prisma.$queryRaw<{ user_id: string }[]>`
          SELECT DISTINCT user_id FROM notifications
          WHERE type = 'event.reminder'
            AND payload->>'eventId' = ${event.id}
            AND user_id = ANY(${userIds.map((r) => r.user_id)}::uuid[])
        `;
        const sentSet = new Set(alreadySent.map((r) => r.user_id));
        const remaining = userIds.filter((r) => !sentSet.has(r.user_id));

        for (const { user_id: userId } of remaining) {
          await this.notifications.fanOut(
            userId,
            'event.reminder',
            { eventId: event.id, title: event.title, startsAt: event.startsAt.toISOString() },
            {
              prefKey: 'notifyEvents',
              respectQuietHours: true,
              push: {
                title: event.title,
                body: `Starts in ~2h${event.host ? ` · ${event.host}` : ''}`,
                data: { type: 'event.reminder', eventId: event.id },
              },
            },
          );
        }
        if (remaining.length > 0) {
          this.logger.log(`event-reminder: pinged ${remaining.length} users for "${event.title}"`);
        }
      }
    } catch (err: any) {
      this.logger.error(`event-reminder failed: ${err?.message}`);
    } finally {
      await this.redis.client.del(this.LOCK_KEY);
    }
  }
}
