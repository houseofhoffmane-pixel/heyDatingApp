import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { AuditService } from './audit.service';
import {
  CreatePromptDto, UpdatePromptDto, UpsertInterestDto, CreateCityDto, UpdateCityDto,
} from './dto/admin.dto';

/**
 * Catalog data — the rest of the app reads these tables on every request,
 * so changes here propagate immediately (no caching layer to invalidate).
 */
@Injectable()
export class AdminCatalogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Prompts ──────────────────────────────────────────────────

  listPrompts() {
    return this.prisma.prompt.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createPrompt(adminId: string, dto: CreatePromptDto) {
    const row = await this.prisma.prompt.create({
      data: { text: dto.text, active: dto.active ?? true },
    });
    await this.audit.log({ adminId, action: 'prompt.create', target: `prompt:${row.id}`, after: dto });
    return row;
  }

  async updatePrompt(adminId: string, id: string, dto: UpdatePromptDto) {
    const before = await this.prisma.prompt.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('PROMPT_NOT_FOUND', 'Prompt not found.');
    const row = await this.prisma.prompt.update({ where: { id }, data: dto });
    await this.audit.log({ adminId, action: 'prompt.update', target: `prompt:${id}`, before, after: dto });
    return row;
  }

  async deletePrompt(adminId: string, id: string) {
    const before = await this.prisma.prompt.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('PROMPT_NOT_FOUND', 'Prompt not found.');
    // Soft-disable rather than delete — existing profile_prompts FK to this row.
    await this.prisma.prompt.update({ where: { id }, data: { active: false } });
    await this.audit.log({ adminId, action: 'prompt.deactivate', target: `prompt:${id}`, before });
    return { ok: true };
  }

  // ── Interests ────────────────────────────────────────────────

  listInterests() {
    return this.prisma.interest.findMany({ orderBy: [{ category: 'asc' }, { slug: 'asc' }] });
  }

  async upsertInterest(adminId: string, dto: UpsertInterestDto) {
    const before = await this.prisma.interest.findUnique({ where: { slug: dto.slug } });
    const row = await this.prisma.interest.upsert({
      where: { slug: dto.slug },
      create: dto,
      update: { label: dto.label, category: dto.category },
    });
    await this.audit.log({
      adminId, action: before ? 'interest.update' : 'interest.create',
      target: `interest:${row.id}`, before, after: dto,
    });
    return row;
  }

  async deleteInterest(adminId: string, id: string) {
    const before = await this.prisma.interest.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('INTEREST_NOT_FOUND', 'Interest not found.');
    await this.prisma.interest.delete({ where: { id } });
    await this.audit.log({ adminId, action: 'interest.delete', target: `interest:${id}`, before });
    return { ok: true };
  }

  // ── Cities ───────────────────────────────────────────────────

  async listCities() {
    return this.prisma.$queryRaw<{ id: string; slug: string; name: string; country: string; lat: number | null; lng: number | null; radius_km: number }[]>`
      SELECT id, slug, name, country, radius_km,
             ST_Y(center::geometry)::float AS lat, ST_X(center::geometry)::float AS lng
      FROM "cities" ORDER BY name ASC
    `;
  }

  async createCity(adminId: string, dto: CreateCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { slug: dto.slug } });
    if (existing) throw ApiError.conflict('SLUG_TAKEN', 'City slug already exists.');

    const inserted = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "cities" ("slug","name","country","radius_km","center")
      VALUES (${dto.slug}, ${dto.name}, ${dto.country}, ${dto.radiusKm ?? 50},
              ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography)
      RETURNING "id"
    `;
    const id = inserted[0].id;
    await this.audit.log({ adminId, action: 'city.create', target: `city:${id}`, after: dto });
    return { id };
  }

  async updateCity(adminId: string, id: string, dto: UpdateCityDto) {
    const before = await this.prisma.city.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('CITY_NOT_FOUND', 'City not found.');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.radiusKm !== undefined) data.radiusKm = dto.radiusKm;
    await this.prisma.city.update({ where: { id }, data });

    if (dto.lat !== undefined && dto.lng !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE "cities" SET "center" = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography
        WHERE "id" = ${id}::uuid
      `;
    }
    await this.audit.log({ adminId, action: 'city.update', target: `city:${id}`, before, after: dto });
    return { id, ok: true };
  }
}
