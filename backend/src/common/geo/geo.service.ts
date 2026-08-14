import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * GeoService — raw-SQL helpers for the PostGIS geography columns.
 *
 * Prisma's `Unsupported("geography(Point, 4326)")` columns can't be
 * read/written through the generated client, so every spatial op lives
 * here. The single source of truth for "100m" / "1 mile" etc. is the
 * caller — these helpers take meters and return meters.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Distance in meters between a place and a coordinate. */
  async distanceToPlace(placeId: string, lat: number, lng: number): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ dist: number }[]>`
      SELECT ST_Distance(
        "location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )::float AS dist
      FROM "places" WHERE "id" = ${placeId}::uuid
    `;
    return rows[0]?.dist ?? null;
  }

  /** Distance in meters between an event and a coordinate. */
  async distanceToEvent(eventId: string, lat: number, lng: number): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ dist: number }[]>`
      SELECT ST_Distance(
        "location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )::float AS dist
      FROM "events" WHERE "id" = ${eventId}::uuid
    `;
    return rows[0]?.dist ?? null;
  }

  /** Update the profile's last-known location. */
  async setProfileLocation(profileId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "profiles"
         SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
             "updated_at" = NOW()
       WHERE "id" = ${profileId}::uuid
    `;
  }

  /**
   * Find candidate user IDs within `radiusMeters` of a coordinate. Used by
   * the discovery feed before in-memory ranking. Returns profile_id and
   * distance in meters, ordered by distance.
   */
  async profilesWithin(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit = 500,
  ): Promise<{ profileId: string; userId: string; distM: number }[]> {
    return this.prisma.$queryRaw<{ profileId: string; userId: string; distM: number }[]>`
      SELECT
        "id"      AS "profileId",
        "user_id" AS "userId",
        ST_Distance(
          "location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        )::float AS "distM"
      FROM "profiles"
      WHERE "location" IS NOT NULL
        AND ST_DWithin(
              "location",
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${radiusMeters}
            )
      ORDER BY "distM" ASC
      LIMIT ${limit}
    `;
  }

  /**
   * List places near a coordinate. Used by GET /places.
   * Returns place id + raw distance in meters (caller rounds for display).
   */
  async placesNear(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit = 200,
  ): Promise<{ id: string; distM: number }[]> {
    return this.prisma.$queryRaw<{ id: string; distM: number }[]>`
      SELECT
        "id",
        ST_Distance(
          "location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        )::float AS "distM"
      FROM "places"
      WHERE "active" = TRUE
        AND "location" IS NOT NULL
        AND ST_DWithin(
              "location",
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${radiusMeters}
            )
      ORDER BY "distM" ASC
      LIMIT ${limit}
    `;
  }

  /** Set a place's location (admin geocode result). */
  async setPlaceLocation(placeId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "places"
         SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
             "updated_at" = NOW()
       WHERE "id" = ${placeId}::uuid
    `;
  }

  /** Set an event's location. */
  async setEventLocation(eventId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "events"
         SET "location" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
             "updated_at" = NOW()
       WHERE "id" = ${eventId}::uuid
    `;
  }
}
