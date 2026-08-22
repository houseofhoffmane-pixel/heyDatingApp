import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * GeoService — raw-SQL helpers for the profiles.location PostGIS
 * geography column.
 *
 * Postgres/PostGIS after Sprint 9. Distance in meters via ST_Distance
 * on geography type. Coordinates stored as SRID 4326 (WGS84).
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Update the profile's last-known location. */
  async setProfileLocation(profileId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "profiles"
         SET "location"   = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
             "updated_at" = NOW()
       WHERE "id" = ${profileId}::uuid
    `;
  }

  /**
   * Find candidate profile IDs within `radiusMeters` of a coordinate.
   * DiscoveryService inlines the equivalent query so it can combine
   * distance with all its other filters in one shot — this helper is
   * the canonical spatial primitive.
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
}
