import { Injectable } from '@nestjs/common';
import { Prisma, RsvpStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { StorageService } from '../storage/storage.service';
import { ListEventsDto } from './dto/list-events.dto';
import { GoingQueryDto } from './dto/going-query.dto';

interface EventListRow {
  id: string;
  title: string;
  host: string;
  vibe: string;
  starts_at: Date;
  ends_at: Date;
  door_text: string;
  cover_text: string;
  city_id: string;
  place_id: string | null;
  tags: string[];
  icon: string;
  tone: string;
  hot: boolean;
  lat: number | null;
  lng: number | null;
  going_count: number;
  matches_going_count: number;
  i_rsvpd: boolean;
  i_saved: boolean;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── GET /events ──────────────────────────────────────────────

  async list(viewerId: string, dto: ListEventsDto) {
    const cursor = dto.cursor ? new Date(dto.cursor) : null;
    if (dto.cursor && Number.isNaN(cursor?.getTime() ?? NaN)) {
      throw ApiError.badRequest('CURSOR_INVALID', 'Bad cursor.');
    }

    // Date filter — UI semantics: tonight = today; this-week = next 7 days.
    let startWindow: Date | null = null;
    let endWindow: Date | null = null;
    if (dto.filter === 'tonight') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      // tomorrow 6am to capture late-night events
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
      startWindow = new Date();
      endWindow = end;
    } else if (dto.filter === 'this-week') {
      startWindow = new Date();
      endWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const isFree = dto.filter === 'free';
    const onlySaved = dto.filter === 'saved';
    const onlyRsvpd = dto.filter === 'rsvpd';

    // One shot: rows + goingCount + matchesGoingCount + viewer flags.
    // matchesGoing = attendees who are matches or anyone the viewer has a
    // like with (either direction).
    const rows = await this.prisma.$queryRaw<EventListRow[]>`
      WITH viewer_related AS (
        SELECT DISTINCT user_id FROM (
          SELECT CASE WHEN m.user_a_id = ${viewerId}::uuid THEN m.user_b_id ELSE m.user_a_id END AS user_id
          FROM matches m
          WHERE m.status = 'active' AND (m.user_a_id = ${viewerId}::uuid OR m.user_b_id = ${viewerId}::uuid)
          UNION
          SELECT to_user_id   AS user_id FROM likes WHERE from_user_id = ${viewerId}::uuid
          UNION
          SELECT from_user_id AS user_id FROM likes WHERE to_user_id   = ${viewerId}::uuid
        ) z
      )
      SELECT
        e.id, e.title, e.host, e.vibe, e.starts_at, e.ends_at,
        e.door_text, e.cover_text, e.city_id, e.place_id, e.tags,
        e.icon, e.tone, e.hot,
        ST_Y(e.location::geometry)::float AS lat,
        ST_X(e.location::geometry)::float AS lng,
        (SELECT COUNT(*)::int FROM event_rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
        (SELECT COUNT(*)::int FROM event_rsvps r
           WHERE r.event_id = e.id AND r.status = 'going'
             AND r.user_id IN (SELECT user_id FROM viewer_related)) AS matches_going_count,
        EXISTS (SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id AND r.user_id = ${viewerId}::uuid AND r.status = 'going') AS i_rsvpd,
        EXISTS (SELECT 1 FROM saved_events s WHERE s.event_id = e.id AND s.user_id = ${viewerId}::uuid)                       AS i_saved
      FROM events e
      WHERE e.active = TRUE
        AND e.ends_at > NOW()
        ${dto.cityId ? Prisma.sql`AND e.city_id = ${dto.cityId}::uuid` : Prisma.empty}
        ${startWindow ? Prisma.sql`AND e.starts_at <= ${endWindow}::timestamptz AND e.ends_at >= ${startWindow}::timestamptz` : Prisma.empty}
        ${isFree ? Prisma.sql`AND e.cover_text IN ('free', 'donate')` : Prisma.empty}
        ${onlySaved ? Prisma.sql`AND EXISTS (SELECT 1 FROM saved_events s WHERE s.event_id = e.id AND s.user_id = ${viewerId}::uuid)` : Prisma.empty}
        ${onlyRsvpd ? Prisma.sql`AND EXISTS (SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id AND r.user_id = ${viewerId}::uuid AND r.status = 'going')` : Prisma.empty}
        ${cursor ? Prisma.sql`AND e.starts_at > ${cursor}::timestamptz` : Prisma.empty}
      ORDER BY e.starts_at ASC
      LIMIT ${dto.limit + 1}
    `;

    const hasMore = rows.length > dto.limit;
    const page = hasMore ? rows.slice(0, dto.limit) : rows;

    return {
      data: page.map((r) => shapeEvent(r)),
      meta: {
        cursor: hasMore && page.length > 0 ? page[page.length - 1].starts_at.toISOString() : null,
      },
    };
  }

  // ── GET /events/:id ──────────────────────────────────────────

  async detail(viewerId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.active) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');

    const [counts, matchesGoing, iRsvpd, iSaved, place] = await Promise.all([
      this.prisma.eventRsvp.aggregate({
        where: { eventId, status: RsvpStatus.going },
        _count: { _all: true },
      }),
      this.fetchMatchesGoing(viewerId, eventId, 8),
      this.prisma.eventRsvp.findUnique({
        where: { userId_eventId: { userId: viewerId, eventId } },
      }).then((r) => r?.status === RsvpStatus.going),
      this.prisma.savedEvent.findUnique({
        where: { userId_eventId: { userId: viewerId, eventId } },
      }).then((r) => !!r),
      event.placeId
        ? this.prisma.place.findUnique({ where: { id: event.placeId }, select: { id: true, label: true } })
        : Promise.resolve(null),
    ]);

    // Read the event's lat/lng for the map pin.
    const loc = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(location::geometry)::float AS lat, ST_X(location::geometry)::float AS lng
      FROM "events" WHERE "id" = ${eventId}::uuid
    `;

    const now = Date.now();
    const checkinOpen = now >= event.startsAt.getTime() && now <= event.endsAt.getTime();

    return {
      id: event.id,
      title: event.title,
      host: event.host,
      vibe: event.vibe,
      placeId: event.placeId,
      place,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      doorText: event.doorText,
      coverText: event.coverText,
      tags: event.tags,
      icon: event.icon,
      tone: event.tone,
      hot: event.hot,
      cityId: event.cityId,
      lat: loc[0]?.lat ?? null,
      lng: loc[0]?.lng ?? null,
      goingCount: counts._count._all,
      matchesGoing,
      iRsvpd,
      iSaved,
      checkinOpen,
    };
  }

  // ── POST/DELETE /events/:id/rsvp ─────────────────────────────

  async rsvp(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.active) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');
    if (event.endsAt.getTime() < Date.now()) {
      throw ApiError.unprocessable('EVENT_ENDED', 'This event is over.');
    }

    await this.prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, status: RsvpStatus.going },
      update: { status: RsvpStatus.going },
    });
    return { ok: true, status: 'going' as const };
  }

  async cancelRsvp(userId: string, eventId: string) {
    await this.prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, status: RsvpStatus.cancelled },
      update: { status: RsvpStatus.cancelled },
    });
    return { ok: true, status: 'cancelled' as const };
  }

  // ── POST/DELETE /events/:id/save ─────────────────────────────

  async save(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');
    await this.prisma.savedEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
    });
    return { ok: true };
  }

  async unsave(userId: string, eventId: string) {
    await this.prisma.savedEvent.deleteMany({ where: { userId, eventId } });
    return { ok: true };
  }

  // ── GET /events/:id/going ────────────────────────────────────

  async going(viewerId: string, eventId: string, dto: GoingQueryDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.active) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');

    const cursor = dto.cursor ? new Date(dto.cursor) : null;
    if (dto.cursor && Number.isNaN(cursor?.getTime() ?? NaN)) {
      throw ApiError.badRequest('CURSOR_INVALID', 'Bad cursor.');
    }

    // RSVPs ordered by createdAt desc, with relationship hint.
    const rows = await this.prisma.$queryRaw<{
      user_id: string; created_at: Date; name: string | null; dob: Date | null;
      main_s3: string | null; is_verified: boolean;
      match_id: string | null; i_liked: boolean; liked_me: boolean;
    }[]>`
      SELECT
        r.user_id, r.created_at,
        p.name, u.dob,
        (
          SELECT s3_key FROM photos
          WHERE profile_id = p.id AND status = 'approved'
          ORDER BY is_main DESC, position ASC LIMIT 1
        ) AS main_s3,
        EXISTS (SELECT 1 FROM verifications v WHERE v.user_id = u.id AND v.status = 'approved') AS is_verified,
        (
          SELECT m.id FROM matches m
          WHERE m.status = 'active'
            AND ((m.user_a_id = ${viewerId}::uuid AND m.user_b_id = u.id)
              OR (m.user_b_id = ${viewerId}::uuid AND m.user_a_id = u.id))
          LIMIT 1
        ) AS match_id,
        EXISTS (SELECT 1 FROM likes l WHERE l.from_user_id = ${viewerId}::uuid AND l.to_user_id = u.id) AS i_liked,
        EXISTS (SELECT 1 FROM likes l WHERE l.from_user_id = u.id AND l.to_user_id = ${viewerId}::uuid) AS liked_me
      FROM event_rsvps r
      JOIN users u    ON u.id = r.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE r.event_id = ${eventId}::uuid
        AND r.status = 'going'
        AND r.user_id <> ${viewerId}::uuid
        AND u.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = u.id)
             OR (b.blocker_id = u.id AND b.blocked_id = ${viewerId}::uuid)
        )
        ${cursor ? Prisma.sql`AND r.created_at < ${cursor}::timestamptz` : Prisma.empty}
      ORDER BY r.created_at DESC
      LIMIT ${dto.limit + 1}
    `;

    const hasMore = rows.length > dto.limit;
    const page = hasMore ? rows.slice(0, dto.limit) : rows;

    const data = await Promise.all(
      page.map(async (r) => ({
        userId: r.user_id,
        name: r.name,
        age: r.dob ? computeAge(r.dob) : null,
        mainPhotoUrl: r.main_s3 ? await this.storage.signRead(r.main_s3) : null,
        isVerified: r.is_verified,
        rsvpdAt: r.created_at.toISOString(),
        relationship: r.match_id ? 'match' : r.liked_me ? 'liked-me' : r.i_liked ? 'i-liked' : null,
      })),
    );

    return {
      data,
      meta: {
        cursor: hasMore && page.length > 0 ? page[page.length - 1].created_at.toISOString() : null,
      },
    };
  }

  // ── internals ────────────────────────────────────────────────

  private async fetchMatchesGoing(viewerId: string, eventId: string, limit: number) {
    const rows = await this.prisma.$queryRaw<{
      user_id: string; name: string | null; dob: Date | null; main_s3: string | null;
      relationship: 'match' | 'i-liked' | 'liked-me';
    }[]>`
      WITH viewer_related AS (
        SELECT DISTINCT user_id, relationship FROM (
          SELECT CASE WHEN m.user_a_id = ${viewerId}::uuid THEN m.user_b_id ELSE m.user_a_id END AS user_id,
                 'match'::text AS relationship
          FROM matches m
          WHERE m.status = 'active' AND (m.user_a_id = ${viewerId}::uuid OR m.user_b_id = ${viewerId}::uuid)
          UNION
          SELECT to_user_id AS user_id, 'i-liked'::text   AS relationship FROM likes WHERE from_user_id = ${viewerId}::uuid
          UNION
          SELECT from_user_id AS user_id, 'liked-me'::text AS relationship FROM likes WHERE to_user_id   = ${viewerId}::uuid
        ) z
      )
      SELECT
        r.user_id, p.name, u.dob,
        (
          SELECT s3_key FROM photos
          WHERE profile_id = p.id AND status = 'approved'
          ORDER BY is_main DESC, position ASC LIMIT 1
        ) AS main_s3,
        vr.relationship
      FROM event_rsvps r
      JOIN users u    ON u.id = r.user_id
      JOIN profiles p ON p.user_id = u.id
      JOIN viewer_related vr ON vr.user_id = u.id
      WHERE r.event_id = ${eventId}::uuid
        AND r.status = 'going'
        AND u.status = 'active'
      ORDER BY CASE vr.relationship WHEN 'match' THEN 0 WHEN 'liked-me' THEN 1 ELSE 2 END, r.created_at DESC
      LIMIT ${limit}
    `;
    return Promise.all(
      rows.map(async (r) => ({
        userId: r.user_id,
        name: r.name,
        age: r.dob ? computeAge(r.dob) : null,
        mainPhotoUrl: r.main_s3 ? await this.storage.signRead(r.main_s3) : null,
        relationship: r.relationship,
      })),
    );
  }
}

function shapeEvent(r: EventListRow) {
  return {
    id: r.id,
    title: r.title,
    host: r.host,
    vibe: r.vibe,
    placeId: r.place_id,
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    doorText: r.door_text,
    coverText: r.cover_text,
    tags: r.tags,
    icon: r.icon,
    tone: r.tone,
    hot: r.hot,
    cityId: r.city_id,
    lat: r.lat,
    lng: r.lng,
    goingCount: r.going_count,
    matchesGoingCount: r.matches_going_count,
    iRsvpd: r.i_rsvpd,
    iSaved: r.i_saved,
  };
}

function computeAge(dob: Date): number {
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
}
