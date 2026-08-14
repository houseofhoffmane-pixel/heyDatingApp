import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { RateLimitService } from '../../common/ratelimit/ratelimit.service';
import { GeoService } from '../../common/geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { loadEnv } from '../../common/config/env';

/**
 * Owns the lifecycle of a place check-in. Split from PlacesService because
 * the rules (radius validation, spoof guard, rate limit, 2h expiry,
 * counter broadcast, room join) are non-trivial and reused by the cron
 * expiry job and EventsService (Step 9) — events use the same checkins
 * table, just keyed on event_id.
 *
 * Source of truth = DB. The `place:count` broadcast queries
 * `COUNT(*) WHERE place_id=? AND left_at IS NULL AND expires_at > NOW()`
 * after every mutation, so transient drift between gateway instances
 * never accumulates.
 */
@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly geo: GeoService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── POST /places/:id/checkin ─────────────────────────────────

  async checkInAtPlace(userId: string, placeId: string, lat: number, lng: number) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place || !place.active) throw ApiError.notFound('PLACE_NOT_FOUND', 'Spot not found.');

    const env = loadEnv();

    // Radius gate. ST_Distance returns meters because columns are geography.
    const distM = await this.geo.distanceToPlace(placeId, lat, lng);
    if (distM == null) {
      throw ApiError.badRequest('PLACE_NO_LOCATION', 'This spot has no location yet.');
    }
    if (distM > env.CHECKIN_RADIUS_M) {
      throw ApiError.unprocessable('TOO_FAR', `You\'re ${Math.round(distM)}m away — get within ${env.CHECKIN_RADIUS_M}m to check in.`);
    }

    // Anti-spoof: impossible jump (> 300 km/h between consecutive coords).
    await this.guardSpoof(userId, lat, lng);

    // Per-user rate limit on new check-ins.
    const rl = await this.rateLimit.hit(
      `checkin:${userId}`,
      env.RL_CHECKINS_PER_5MIN,
      5 * 60,
    );
    if (!rl.allowed) {
      throw ApiError.tooManyRequests('CHECKIN_RATE_LIMITED', 'You just checked in. Take a beat.', rl.retryAfterSeconds);
    }

    const expiresAt = new Date(Date.now() + env.CHECKIN_TTL_HOURS * 60 * 60 * 1000);

    // Idempotent: if the user is already active here, return that row.
    const existing = await this.prisma.checkin.findFirst({
      where: { userId, placeId, leftAt: null },
    });
    if (existing) {
      return this.shapeCheckin(existing, place, await this.activeCount(placeId));
    }

    // If they're checked in at a DIFFERENT spot/event, leave it first.
    await this.silentLeaveActive(userId);

    let checkin;
    try {
      checkin = await this.prisma.checkin.create({
        data: {
          userId, placeId, expiresAt,
          deviceLat: lat, deviceLng: lng,
        },
      });
    } catch (err) {
      // partial unique index "one active per (user, place)" raced — re-read
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const refound = await this.prisma.checkin.findFirst({
          where: { userId, placeId, leftAt: null },
        });
        if (refound) return this.shapeCheckin(refound, place, await this.activeCount(placeId));
      }
      throw err;
    }

    // Push the user's last-known location to their checkin coords so the
    // discovery feed prioritises people physically near them right now.
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (profile) await this.geo.setProfileLocation(profile.id, lat, lng);

    await this.realtime.joinPlaceForUser(userId, placeId);
    const count = await this.activeCount(placeId);
    this.realtime.emitToPlace(placeId, 'place:count', { placeId, count });

    // §7.10: notify any active matches who are *also* checked in here right now.
    this.notifyMatchesCoPresent(userId, place).catch(() => undefined);

    return this.shapeCheckin(checkin, place, count);
  }

  // ── POST /places/:id/leave ───────────────────────────────────

  async leavePlace(userId: string, placeId: string) {
    const active = await this.prisma.checkin.findFirst({
      where: { userId, placeId, leftAt: null },
    });
    if (!active) return { ok: true, alreadyLeft: true };

    await this.prisma.checkin.update({
      where: { id: active.id },
      data: { leftAt: new Date() },
    });

    await this.realtime.leavePlaceForUser(userId, placeId);
    const count = await this.activeCount(placeId);
    this.realtime.emitToPlace(placeId, 'place:count', { placeId, count });

    return { ok: true, count };
  }

  // ── POST /events/:id/checkin ─────────────────────────────────

  /**
   * Day-of check-in to an event. Same radius + spoof + rate-limit gates as
   * places, plus a window check: `now` must be within `[startsAt, endsAt]`.
   * The Event "I'm here" button on the frontend is enabled only during
   * that window; this is the server-side enforcement.
   */
  async checkInAtEvent(userId: string, eventId: string, lat: number, lng: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.active) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');

    const now = Date.now();
    if (now < event.startsAt.getTime()) {
      throw ApiError.unprocessable('EVENT_NOT_STARTED', 'Check-in opens when the event starts.');
    }
    if (now > event.endsAt.getTime()) {
      throw ApiError.unprocessable('EVENT_ENDED', 'This event is over.');
    }

    const env = loadEnv();

    const distM = await this.geo.distanceToEvent(eventId, lat, lng);
    if (distM == null) {
      throw ApiError.badRequest('EVENT_NO_LOCATION', 'This event has no location yet.');
    }
    if (distM > env.CHECKIN_RADIUS_M) {
      throw ApiError.unprocessable('TOO_FAR', `You\'re ${Math.round(distM)}m away — get within ${env.CHECKIN_RADIUS_M}m to check in.`);
    }

    await this.guardSpoof(userId, lat, lng);

    const rl = await this.rateLimit.hit(`checkin:${userId}`, env.RL_CHECKINS_PER_5MIN, 5 * 60);
    if (!rl.allowed) {
      throw ApiError.tooManyRequests('CHECKIN_RATE_LIMITED', 'You just checked in. Take a beat.', rl.retryAfterSeconds);
    }

    // Auto-expire either at event end OR after the configured TTL — whichever's sooner.
    const ttlMs = env.CHECKIN_TTL_HOURS * 60 * 60 * 1000;
    const expiresAt = new Date(Math.min(now + ttlMs, event.endsAt.getTime()));

    const existing = await this.prisma.checkin.findFirst({
      where: { userId, eventId, leftAt: null },
    });
    if (existing) {
      return this.shapeEventCheckin(existing, event, await this.activeEventCount(eventId));
    }

    await this.silentLeaveActive(userId);

    let checkin;
    try {
      checkin = await this.prisma.checkin.create({
        data: { userId, eventId, expiresAt, deviceLat: lat, deviceLng: lng },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const refound = await this.prisma.checkin.findFirst({ where: { userId, eventId, leftAt: null } });
        if (refound) return this.shapeEventCheckin(refound, event, await this.activeEventCount(eventId));
      }
      throw err;
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (profile) await this.geo.setProfileLocation(profile.id, lat, lng);

    await this.realtime.joinPlaceForUser(userId, eventId); // place: + event: rooms use the same join helper
    const count = await this.activeEventCount(eventId);
    this.realtime.emitToEvent(eventId, 'event:count', { eventId, count });

    return this.shapeEventCheckin(checkin, event, count);
  }

  async leaveEvent(userId: string, eventId: string) {
    const active = await this.prisma.checkin.findFirst({
      where: { userId, eventId, leftAt: null },
    });
    if (!active) return { ok: true, alreadyLeft: true };

    await this.prisma.checkin.update({
      where: { id: active.id },
      data: { leftAt: new Date() },
    });

    await this.realtime.leavePlaceForUser(userId, eventId);
    const count = await this.activeEventCount(eventId);
    this.realtime.emitToEvent(eventId, 'event:count', { eventId, count });

    return { ok: true, count };
  }

  async activeEventCount(eventId: string): Promise<number> {
    return this.prisma.checkin.count({
      where: { eventId, leftAt: null, expiresAt: { gt: new Date() } },
    });
  }

  // ── Cron-side expiry (called from CheckinExpiryProcessor) ────

  async expireDue(now: Date = new Date()): Promise<{ expired: number; placesTouched: string[]; eventsTouched: string[] }> {
    // Find expired-but-still-open checkins.
    const due = await this.prisma.checkin.findMany({
      where: { leftAt: null, expiresAt: { lte: now } },
      select: { id: true, userId: true, placeId: true, eventId: true },
    });
    if (due.length === 0) return { expired: 0, placesTouched: [], eventsTouched: [] };

    await this.prisma.checkin.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { leftAt: now },
    });

    // Per-room broadcasts.
    const placesTouched = Array.from(new Set(due.map((d) => d.placeId).filter(Boolean) as string[]));
    const eventsTouched = Array.from(new Set(due.map((d) => d.eventId).filter(Boolean) as string[]));
    for (const placeId of placesTouched) {
      const count = await this.activeCount(placeId);
      this.realtime.emitToPlace(placeId, 'place:count', { placeId, count });
    }
    for (const eventId of eventsTouched) {
      const count = await this.activeEventCount(eventId);
      this.realtime.emitToEvent(eventId, 'event:count', { eventId, count });
    }
    // Tell each user their checkin expired so the client can update.
    for (const d of due) {
      this.realtime.emitToUser(d.userId, 'checkin:expired', {
        placeId: d.placeId, eventId: d.eventId,
      });
      if (d.placeId)  await this.realtime.leavePlaceForUser(d.userId, d.placeId).catch(() => undefined);
      if (d.eventId)  await this.realtime.leavePlaceForUser(d.userId, d.eventId).catch(() => undefined);
    }
    return { expired: due.length, placesTouched, eventsTouched };
  }

  // ── helpers ──────────────────────────────────────────────────

  /** Count active checkins at a place (DB is source of truth). */
  async activeCount(placeId: string): Promise<number> {
    return this.prisma.checkin.count({
      where: { placeId, leftAt: null, expiresAt: { gt: new Date() } },
    });
  }

  private async silentLeaveActive(userId: string) {
    const active = await this.prisma.checkin.findMany({
      where: { userId, leftAt: null },
      select: { id: true, placeId: true },
    });
    if (active.length === 0) return;
    await this.prisma.checkin.updateMany({
      where: { id: { in: active.map((a) => a.id) } },
      data: { leftAt: new Date() },
    });
    for (const a of active) {
      if (a.placeId) {
        await this.realtime.leavePlaceForUser(userId, a.placeId).catch(() => undefined);
        const c = await this.activeCount(a.placeId);
        this.realtime.emitToPlace(a.placeId, 'place:count', { placeId: a.placeId, count: c });
      }
    }
  }

  private async guardSpoof(userId: string, lat: number, lng: number) {
    const last = await this.prisma.checkin.findFirst({
      where: { userId },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true, deviceLat: true, deviceLng: true },
    });
    if (!last) return;

    const distM = haversineMeters(last.deviceLat, last.deviceLng, lat, lng);
    const seconds = (Date.now() - last.checkedInAt.getTime()) / 1000;
    if (seconds <= 0) return;

    const speedKmh = (distM / 1000) / (seconds / 3600);
    if (speedKmh > 300) {
      this.logger.warn(`spoof guard: user=${userId} speed=${speedKmh.toFixed(0)} km/h`);
      throw ApiError.unprocessable('SPOOF_DETECTED', 'Movement looks impossible — try again from a stable location.');
    }
  }

  /**
   * Find every active match of `arriverId` who is currently checked into
   * the same place, drop a `place.match-here` notification + push for each.
   * Idempotency: the notifications table dedupes us across re-checkins in
   * the same TTL via a payload check.
   */
  private async notifyMatchesCoPresent(arriverId: string, place: { id: string; label: string }) {
    // Active matches of the arriver.
    const matches = await this.prisma.match.findMany({
      where: { status: 'active', OR: [{ userAId: arriverId }, { userBId: arriverId }] },
      select: { id: true, userAId: true, userBId: true },
    });
    if (matches.length === 0) return;
    const matchUsers = matches.map((m) => (m.userAId === arriverId ? m.userBId : m.userAId));

    // Of those, who is co-present?
    const coPresent = await this.prisma.checkin.findMany({
      where: {
        userId: { in: matchUsers },
        placeId: place.id,
        leftAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { userId: true },
    });
    if (coPresent.length === 0) return;

    const arriverProfile = await this.prisma.profile.findUnique({
      where: { userId: arriverId }, select: { name: true },
    });

    await Promise.all(coPresent.map((c) =>
      this.notifications.fanOut(
        c.userId,
        'place.match-here',
        { placeId: place.id, placeLabel: place.label, otherUserId: arriverId },
        {
          prefKey: 'notifyPlaces',
          respectQuietHours: true,
          push: {
            title: `${arriverProfile?.name ?? 'A match'} just arrived`,
            body: `they're at ${place.label}`,
            data: { type: 'place.match-here', placeId: place.id, otherUserId: arriverId },
          },
        },
      ).catch(() => undefined),
    ));
  }

  private shapeCheckin(checkin: { id: string; placeId: string | null; checkedInAt: Date; expiresAt: Date }, place: { id: string; label: string }, count: number) {
    return {
      id: checkin.id,
      placeId: place.id,
      placeLabel: place.label,
      checkedInAt: checkin.checkedInAt.toISOString(),
      expiresAt: checkin.expiresAt.toISOString(),
      ttlMinutes: Math.max(0, Math.round((checkin.expiresAt.getTime() - Date.now()) / 60_000)),
      count,
    };
  }

  private shapeEventCheckin(checkin: { id: string; eventId: string | null; checkedInAt: Date; expiresAt: Date }, event: { id: string; title: string }, count: number) {
    return {
      id: checkin.id,
      eventId: event.id,
      eventTitle: event.title,
      checkedInAt: checkin.checkedInAt.toISOString(),
      expiresAt: checkin.expiresAt.toISOString(),
      ttlMinutes: Math.max(0, Math.round((checkin.expiresAt.getTime() - Date.now()) / 60_000)),
      count,
    };
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
