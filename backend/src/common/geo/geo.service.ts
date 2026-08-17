import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * GeoService — raw-SQL helpers for the profiles.location POINT column.
 *
 * MySQL 8 replaces the Sprint 1/2 PostGIS setup:
 *   - Column is `POINT` (SRID 0, unprojected) — Prisma doesn't model
 *     spatial types, the column exists only in the init migration.
 *   - Coordinates are written as `POINT(lng, lat)` (x=lng, y=lat).
 *   - Distance is computed with `ST_Distance_Sphere(a, b)` which
 *     returns meters using great-circle math and reads its arguments
 *     as (longitude, latitude) regardless of SRID.
 *
 * "1 mile" etc. lives in the caller — these helpers take meters,
 * return meters.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Update the profile's last-known location. */
  async setProfileLocation(profileId: string, lat: number, lng: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE profiles
         SET location   = POINT(${lng}, ${lat}),
             updated_at = CURRENT_TIMESTAMP(6)
       WHERE id = ${profileId}
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
        id      AS profileId,
        user_id AS userId,
        ST_Distance_Sphere(location, POINT(${lng}, ${lat})) AS distM
      FROM profiles
      WHERE location IS NOT NULL
        AND ST_Distance_Sphere(location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ORDER BY distM ASC
      LIMIT ${limit}
    `;
  }
}
