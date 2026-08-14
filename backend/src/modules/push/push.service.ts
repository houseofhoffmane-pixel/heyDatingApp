import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PUSH_PROVIDER, PushPayload, PushProvider } from './providers/push.provider';

/**
 * Push facade — looks up the user's registered device tokens, applies
 * notification preferences + quiet-hours gating, then hands off to the
 * configured provider (stub or real FCM).
 *
 * For Step 7 the preferences / quiet-hours bits are deliberately minimal
 * (read the row, honor the matching toggle). Step 10 fleshes out the
 * full preference matrix and per-notification-type gating.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_PROVIDER) private readonly provider: PushProvider,
  ) {}

  /**
   * Send a push to the given user. `prefKey` indicates which user_settings
   * toggle gates this push. `respectQuietHours` controls quiet-hours check.
   */
  async sendToUser(
    userId: string,
    payload: PushPayload,
    opts: { prefKey?: 'notifyMessages' | 'notifyMatches' | 'notifyLikes' | 'notifyPlaces' | 'notifyEvents'; respectQuietHours?: boolean } = {},
  ) {
    if (opts.prefKey || opts.respectQuietHours) {
      const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
      if (settings) {
        if (opts.prefKey && (settings as any)[opts.prefKey] === false) {
          return { sent: 0, failed: 0, skipped: 'pref_off' as const };
        }
        if (opts.respectQuietHours && inQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
          return { sent: 0, failed: 0, skipped: 'quiet_hours' as const };
        }
      }
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { fcmToken: true },
    });
    if (tokens.length === 0) {
      return { sent: 0, failed: 0, skipped: 'no_tokens' as const };
    }
    const result = await this.provider.send(
      { userId, fcmTokens: tokens.map((t) => t.fcmToken) },
      payload,
    );

    // Purge tokens FCM said are dead — keeps device_tokens tidy and avoids
    // wasting subsequent send slots on the same garbage.
    const purgeTokens = (result as any).purgeTokens as string[] | undefined;
    if (purgeTokens?.length) {
      await this.prisma.deviceToken.deleteMany({
        where: { userId, fcmToken: { in: purgeTokens } },
      });
      this.logger.log(`purged ${purgeTokens.length} dead device tokens for user=${userId}`);
    }
    return result;
  }
}

function inQuietHours(start: number | null, end: number | null): boolean {
  if (start == null || end == null) return false;
  const now = new Date().getHours(); // server-local; spec doesn't pin timezone yet
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  // Spans midnight (e.g. 22 → 8).
  return now >= start || now < end;
}
