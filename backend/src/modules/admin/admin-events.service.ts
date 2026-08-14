import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { GEOCODING_PROVIDER, GeocodingProvider } from '../geocoding/providers/geocoding.provider';
import { AuditService } from './audit.service';
import { CreateAdminEventDto, UpdateAdminEventDto } from './dto/admin.dto';

@Injectable()
export class AdminEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(GEOCODING_PROVIDER) private readonly geocoder: GeocodingProvider,
  ) {}

  async list() {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: 'desc' },
      take: 200,
      include: { _count: { select: { rsvps: { where: { status: 'going' } } } } },
    });
    return {
      data: events.map((e) => ({
        id: e.id,
        title: e.title,
        host: e.host,
        cityId: e.cityId,
        placeId: e.placeId,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        coverText: e.coverText,
        hot: e.hot,
        active: e.active,
        goingCount: e._count.rsvps,
      })),
    };
  }

  async create(adminId: string, dto: CreateAdminEventDto) {
    if (new Date(dto.endsAt).getTime() <= new Date(dto.startsAt).getTime()) {
      throw ApiError.badRequest('TIME_INVERTED', 'endsAt must be after startsAt.');
    }

    // Resolve location: linked place → reuse coords, else geocode the address.
    let lat: number, lng: number;
    if (dto.placeId) {
      const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
        SELECT ST_Y(location::geometry)::float AS lat, ST_X(location::geometry)::float AS lng
        FROM "places" WHERE "id" = ${dto.placeId}::uuid AND "location" IS NOT NULL
      `;
      if (!rows[0]) throw ApiError.badRequest('PLACE_NO_LOCATION', 'Linked place has no location.');
      lat = rows[0].lat; lng = rows[0].lng;
    } else {
      if (!dto.address) throw ApiError.badRequest('ADDRESS_REQUIRED', 'address or placeId required.');
      const city = await this.cityCenter(dto.cityId);
      const geo = await this.geocoder.geocode(dto.address, city);
      if (!geo) throw ApiError.badRequest('GEOCODE_FAILED', 'Could not resolve that address.');
      lat = geo.lat; lng = geo.lng;
    }

    const inserted = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "events"
        ("title","host","vibe","place_id","starts_at","ends_at","door_text","cover_text",
         "city_id","tags","icon","tone","hot","location")
      VALUES
        (${dto.title}, ${dto.host}, ${dto.vibe},
         ${dto.placeId ?? null}::uuid,
         ${new Date(dto.startsAt)}::timestamptz, ${new Date(dto.endsAt)}::timestamptz,
         ${dto.doorText}, ${dto.coverText}, ${dto.cityId}::uuid, ${dto.tags}::text[],
         ${dto.icon}, ${dto.tone}, ${dto.hot ?? false},
         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)
      RETURNING "id"
    `;
    const id = inserted[0].id;
    await this.audit.log({ adminId, action: 'event.create', target: `event:${id}`, after: { ...dto, lat, lng } });
    return { id, lat, lng };
  }

  async update(adminId: string, id: string, dto: UpdateAdminEventDto) {
    const before = await this.prisma.event.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');

    if (dto.startsAt && dto.endsAt && new Date(dto.endsAt).getTime() <= new Date(dto.startsAt).getTime()) {
      throw ApiError.badRequest('TIME_INVERTED', 'endsAt must be after startsAt.');
    }

    const data: Prisma.EventUpdateInput = {};
    if (dto.title !== undefined)     data.title     = dto.title;
    if (dto.host !== undefined)      data.host      = dto.host;
    if (dto.vibe !== undefined)      data.vibe      = dto.vibe;
    if (dto.startsAt !== undefined)  data.startsAt  = new Date(dto.startsAt);
    if (dto.endsAt !== undefined)    data.endsAt    = new Date(dto.endsAt);
    if (dto.doorText !== undefined)  data.doorText  = dto.doorText;
    if (dto.coverText !== undefined) data.coverText = dto.coverText;
    if (dto.tags !== undefined)      data.tags      = dto.tags;
    if (dto.icon !== undefined)      data.icon      = dto.icon;
    if (dto.tone !== undefined)      data.tone      = dto.tone;
    if (dto.hot !== undefined)       data.hot       = dto.hot;
    if (dto.active !== undefined)    data.active    = dto.active;
    if (dto.placeId !== undefined)   data.placeId   = dto.placeId;

    await this.prisma.event.update({ where: { id }, data });

    if (dto.address && !dto.placeId) {
      const city = await this.cityCenter(before.cityId);
      const geo = await this.geocoder.geocode(dto.address, city);
      if (geo) {
        await this.prisma.$executeRaw`
          UPDATE "events" SET "location" = ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography
          WHERE "id" = ${id}::uuid
        `;
      }
    }

    await this.audit.log({ adminId, action: 'event.update', target: `event:${id}`, before, after: dto });
    return { id, ok: true };
  }

  async remove(adminId: string, id: string) {
    const before = await this.prisma.event.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('EVENT_NOT_FOUND', 'Event not found.');
    await this.prisma.event.delete({ where: { id } });
    await this.audit.log({ adminId, action: 'event.delete', target: `event:${id}`, before });
    return { ok: true };
  }

  async attendees(eventId: string) {
    const rows = await this.prisma.eventRsvp.findMany({
      where: { eventId, status: 'going' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true, phoneE164: true, email: true, status: true,
            profile: { select: { name: true } },
          },
        },
      },
    });
    return {
      data: rows.map((r) => ({
        userId: r.user.id,
        name: r.user.profile?.name,
        // PII included here because this is the admin surface.
        phone: r.user.phoneE164,
        email: r.user.email,
        status: r.user.status,
        rsvpdAt: r.createdAt.toISOString(),
      })),
    };
  }

  private async cityCenter(cityId: string): Promise<{ lat: number; lng: number } | undefined> {
    const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(center::geometry)::float AS lat, ST_X(center::geometry)::float AS lng
      FROM "cities" WHERE "id" = ${cityId}::uuid AND "center" IS NOT NULL
    `;
    return rows[0];
  }
}
