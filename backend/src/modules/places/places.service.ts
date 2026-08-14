import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { StorageService } from '../storage/storage.service';
import { ListPlacesDto } from './dto/list-places.dto';
import { RequestPlaceDto } from './dto/request-place.dto';

interface PlaceRow {
  id: string;
  label: string;
  kind: string;
  vibe: string;
  address: string;
  icon: string;
  tone: string;
  hot: boolean;
  city_id: string;
  dist_m: number | null;
  here_count: number;
}

interface PersonHere {
  userId: string;
  name: string | null;
  age: number | null;
  mainPhotoUrl: string | null;
  isVerified: boolean;
  checkedInAt: string;
  relationship: 'match' | 'i-liked' | 'liked-me' | null;
}

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── GET /places ──────────────────────────────────────────────

  async list(viewerId: string, dto: ListPlacesDto) {
    const center = await this.resolveCenter(viewerId, dto.near);
    if (!center) {
      throw ApiError.badRequest('NO_LOCATION', 'Set your location first (PUT /me/location) or pass ?near=lat,lng.');
    }

    const radiusM = dto.radiusKm * 1000;
    const kinds = dto.filters ?? [];
    const hasKindFilter = kinds.length > 0;

    const rows = await this.prisma.$queryRaw<PlaceRow[]>`
      SELECT
        p.id, p.label, p.kind, p.vibe, p.address, p.icon, p.tone, p.hot, p.city_id,
        ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography)::float AS dist_m,
        (
          SELECT COUNT(*)::int FROM checkins c
          WHERE c.place_id = p.id
            AND c.left_at IS NULL
            AND c.expires_at > NOW()
        ) AS here_count
      FROM places p
      WHERE p.active = TRUE
        AND p.location IS NOT NULL
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography, ${radiusM})
        ${hasKindFilter ? Prisma.sql`AND p.kind = ANY(${kinds}::text[])` : Prisma.empty}
      ORDER BY p.hot DESC, dist_m ASC
      LIMIT 500
    `;

    return {
      data: rows.map((r) => ({
        id: r.id,
        label: r.label,
        kind: r.kind,
        vibe: r.vibe,
        address: r.address,
        icon: r.icon,
        tone: r.tone,
        hot: r.hot,
        hereCount: r.here_count,
        distMi: r.dist_m != null ? Math.round((r.dist_m / 1609.34) * 10) / 10 : null,
      })),
      meta: { view: dto.view, count: rows.length },
    };
  }

  // ── GET /places/:id ──────────────────────────────────────────

  async detail(viewerId: string, placeId: string) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place || !place.active) {
      throw ApiError.notFound('PLACE_NOT_FOUND', 'Spot not found.');
    }

    const [hereCount, distMi, isHere, saved] = await Promise.all([
      this.prisma.checkin.count({
        where: { placeId, leftAt: null, expiresAt: { gt: new Date() } },
      }),
      this.distMi(viewerId, placeId),
      this.viewerActiveAtPlace(viewerId, placeId),
      this.prisma.savedSpot.findUnique({
        where: { userId_placeId: { userId: viewerId, placeId } },
      }).then((r) => !!r),
    ]);

    const base = {
      id: place.id,
      label: place.label,
      kind: place.kind,
      vibe: place.vibe,
      address: place.address,
      icon: place.icon,
      tone: place.tone,
      hot: place.hot,
      hereCount,
      distMi,
      saved,
    };

    // Privacy gate — faces only to co-present users.
    if (!isHere) {
      return { ...base, peopleHere: null, locked: true };
    }

    const peopleHere = await this.fetchPeopleHere(viewerId, placeId);
    return { ...base, peopleHere, locked: false };
  }

  // ── POST/DELETE /places/:id/save ─────────────────────────────

  async save(userId: string, placeId: string) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw ApiError.notFound('PLACE_NOT_FOUND', 'Spot not found.');
    await this.prisma.savedSpot.upsert({
      where: { userId_placeId: { userId, placeId } },
      create: { userId, placeId },
      update: {},
    });
    return { ok: true };
  }

  async unsave(userId: string, placeId: string) {
    await this.prisma.savedSpot.deleteMany({ where: { userId, placeId } });
    return { ok: true };
  }

  // ── POST /places/requests ────────────────────────────────────

  async requestPlace(userId: string, dto: RequestPlaceDto) {
    const row = await this.prisma.placeRequest.create({
      data: {
        userId,
        label: dto.label.trim(),
        address: dto.address?.trim(),
        detail: dto.detail.trim(),
      },
    });
    return { id: row.id, status: row.status };
  }

  // ── internals ────────────────────────────────────────────────

  /** Where the listing is centered: either an explicit ?near, or the user's last-known. */
  private async resolveCenter(userId: string, near?: string): Promise<{ lat: number; lng: number } | null> {
    if (near) {
      const [lat, lng] = near.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(location::geometry)::float AS lat, ST_X(location::geometry)::float AS lng
      FROM "profiles" WHERE "user_id" = ${userId}::uuid AND "location" IS NOT NULL
    `;
    return rows[0] ?? null;
  }

  private async distMi(viewerId: string, placeId: string): Promise<number | null> {
    const center = await this.resolveCenter(viewerId);
    if (!center) return null;
    const rows = await this.prisma.$queryRaw<{ d: number }[]>`
      SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography)::float AS d
      FROM "places" WHERE "id" = ${placeId}::uuid
    `;
    return rows[0]?.d != null ? Math.round((rows[0].d / 1609.34) * 10) / 10 : null;
  }

  private async viewerActiveAtPlace(viewerId: string, placeId: string): Promise<boolean> {
    const row = await this.prisma.checkin.findFirst({
      where: { userId: viewerId, placeId, leftAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return !!row;
  }

  private async fetchPeopleHere(viewerId: string, placeId: string): Promise<PersonHere[]> {
    // Active checkins, joined with each user's profile + the viewer's
    // relationship (match / liked / liked-me). Excludes blocks both ways
    // and the show_me_on_places opt-out.
    const rows = await this.prisma.$queryRaw<{
      user_id: string;
      checked_in_at: Date;
      name: string | null;
      dob: Date | null;
      main_s3: string | null;
      is_verified: boolean;
      match_id: string | null;
      i_liked: boolean;
      liked_me: boolean;
    }[]>`
      SELECT
        c.user_id,
        c.checked_in_at,
        p.name,
        u.dob,
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
      FROM checkins c
      JOIN users u    ON u.id = c.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE c.place_id = ${placeId}::uuid
        AND c.left_at IS NULL
        AND c.expires_at > NOW()
        AND c.user_id <> ${viewerId}::uuid
        AND u.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${viewerId}::uuid AND b.blocked_id = u.id)
             OR (b.blocker_id = u.id AND b.blocked_id = ${viewerId}::uuid)
        )
        AND COALESCE(
          (SELECT show_me_on_places FROM filters f WHERE f.user_id = u.id),
          TRUE
        ) = TRUE
      ORDER BY c.checked_in_at DESC
      LIMIT 200
    `;

    return Promise.all(
      rows.map(async (r) => ({
        userId: r.user_id,
        name: r.name,
        age: r.dob ? computeAge(r.dob) : null,
        mainPhotoUrl: r.main_s3 ? await this.storage.signRead(r.main_s3) : null,
        isVerified: r.is_verified,
        checkedInAt: r.checked_in_at.toISOString(),
        relationship: r.match_id ? 'match' : r.liked_me ? 'liked-me' : r.i_liked ? 'i-liked' : null,
      })),
    );
  }
}

function computeAge(dob: Date): number {
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
}
