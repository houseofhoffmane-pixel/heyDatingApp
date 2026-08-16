import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * GeoService — raw-SQL helpers for the profiles.location spatial column.
 *
 * Slim ship-scope: only `profiles.location` remains as a spatial column
 * (used by the discovery distance filter). Place/event geo helpers were
 * removed in Sprint 1 along with those modules.
 *
 * The single source of truth for "1 mile" etc. is the caller — these
 * helpers take meters and return meters.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Find candidate profile IDs within `radiusMeters` of a coordinate.
   * Currently unused directly — DiscoveryService does the query inline
   * so it can combine distance with all its other filters in one shot.
   * Kept here as the canonical spatial helper.
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
