import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { GEOCODING_PROVIDER, GeocodingProvider } from '../geocoding/providers/geocoding.provider';
import { AuditService } from './audit.service';
import {
  CreateAdminPlaceDto, UpdateAdminPlaceDto, ActionPlaceRequestDto,
} from './dto/admin.dto';

@Injectable()
export class AdminPlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(GEOCODING_PROVIDER) private readonly geocoder: GeocodingProvider,
  ) {}

  async list() {
    const rows = await this.prisma.$queryRaw<{
      id: string; label: string; kind: string; active: boolean; hot: boolean;
      city_id: string; lat: number | null; lng: number | null; here_count: number;
    }[]>`
      SELECT p.id, p.label, p.kind, p.active, p.hot, p.city_id,
             ST_Y(p.location::geometry)::float AS lat,
             ST_X(p.location::geometry)::float AS lng,
             (SELECT COUNT(*)::int FROM checkins c WHERE c.place_id = p.id AND c.left_at IS NULL AND c.expires_at > NOW()) AS here_count
      FROM places p
      ORDER BY p.created_at DESC
      LIMIT 500
    `;
    return { data: rows };
  }

  async create(adminId: string, dto: CreateAdminPlaceDto) {
    const city = await this.cityCenter(dto.cityId);
    const geo = await this.geocoder.geocode(dto.address, city);
    if (!geo) throw ApiError.badRequest('GEOCODE_FAILED', 'Could not resolve that address.');

    const inserted = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "places" ("label","kind","vibe","address","icon","tone","hot","city_id","location")
      VALUES (${dto.label}, ${dto.kind}, ${dto.vibe}, ${dto.address}, ${dto.icon}, ${dto.tone},
              ${dto.hot ?? false}, ${dto.cityId}::uuid,
              ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography)
      RETURNING "id"
    `;
    const id = inserted[0].id;

    await this.audit.log({
      adminId, action: 'place.create', target: `place:${id}`,
      after: { ...dto, lat: geo.lat, lng: geo.lng },
    });
    return { id, lat: geo.lat, lng: geo.lng };
  }

  async update(adminId: string, id: string, dto: UpdateAdminPlaceDto) {
    const before = await this.prisma.place.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('PLACE_NOT_FOUND', 'Place not found.');

    // If address changed, re-geocode.
    let geo: { lat: number; lng: number } | null = null;
    if (dto.address && dto.address !== before.address) {
      const city = await this.cityCenter(before.cityId);
      const result = await this.geocoder.geocode(dto.address, city);
      if (!result) throw ApiError.badRequest('GEOCODE_FAILED', 'Could not resolve that address.');
      geo = { lat: result.lat, lng: result.lng };
    }

    const data: Prisma.PlaceUpdateInput = {};
    if (dto.label !== undefined)   data.label  = dto.label;
    if (dto.kind !== undefined)    data.kind   = dto.kind;
    if (dto.vibe !== undefined)    data.vibe   = dto.vibe;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.icon !== undefined)    data.icon   = dto.icon;
    if (dto.tone !== undefined)    data.tone   = dto.tone;
    if (dto.hot !== undefined)     data.hot    = dto.hot;
    if (dto.active !== undefined)  data.active = dto.active;

    await this.prisma.place.update({ where: { id }, data });
    if (geo) {
      await this.prisma.$executeRaw`
        UPDATE "places" SET "location" = ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography
        WHERE "id" = ${id}::uuid
      `;
    }

    await this.audit.log({
      adminId, action: 'place.update', target: `place:${id}`,
      before: { ...before, location: undefined }, after: { ...dto, ...(geo ?? {}) },
    });
    return { id, ok: true };
  }

  async remove(adminId: string, id: string) {
    const before = await this.prisma.place.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('PLACE_NOT_FOUND', 'Place not found.');
    await this.prisma.place.delete({ where: { id } });
    await this.audit.log({
      adminId, action: 'place.delete', target: `place:${id}`, before,
    });
    return { ok: true };
  }

  // ── /admin/places/requests ───────────────────────────────────

  async listRequests() {
    const rows = await this.prisma.placeRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { data: rows };
  }

  async actionRequest(adminId: string, id: string, dto: ActionPlaceRequestDto) {
    const req = await this.prisma.placeRequest.findUnique({ where: { id } });
    if (!req) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found.');
    if (req.status !== 'pending') {
      throw ApiError.badRequest('ALREADY_ACTIONED', 'Already actioned.');
    }

    const status = dto.action === 'approve' ? 'approved' : 'dismissed';
    await this.prisma.placeRequest.update({
      where: { id },
      data: { status, reviewedBy: adminId },
    });

    await this.audit.log({
      adminId, action: `place-request.${dto.action}`, target: `place_request:${id}`,
      before: req, after: { status },
    });
    return { id, status };
  }

  private async cityCenter(cityId: string): Promise<{ lat: number; lng: number } | undefined> {
    const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(center::geometry)::float AS lat, ST_X(center::geometry)::float AS lng
      FROM "cities" WHERE "id" = ${cityId}::uuid AND "center" IS NOT NULL
    `;
    return rows[0];
  }
}
