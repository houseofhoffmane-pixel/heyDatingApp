import { Injectable } from '@nestjs/common';
import { Filters, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { PutFiltersDto } from './dto/filters.dto';

/**
 * Per-user discovery filters. First read after onboarding lazily creates
 * the row, seeding `lookingFor` from the profile so the user's stated
 * preference becomes the initial filter — subsequent PUTs are
 * authoritative overrides.
 */
@Injectable()
export class FiltersService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<Filters> {
    return this.getOrCreate(userId);
  }

  async put(userId: string, dto: PutFiltersDto): Promise<Filters> {
    if (dto.ageMin !== undefined && dto.ageMax !== undefined && dto.ageMin > dto.ageMax) {
      throw ApiError.badRequest('AGE_RANGE_INVERTED', 'ageMin can\'t exceed ageMax.');
    }
    if (dto.heightMinCm !== undefined && dto.heightMaxCm !== undefined && dto.heightMinCm > dto.heightMaxCm) {
      throw ApiError.badRequest('HEIGHT_RANGE_INVERTED', 'heightMinCm can\'t exceed heightMaxCm.');
    }

    await this.getOrCreate(userId);

    const data: Prisma.FiltersUpdateInput = {};
    if (dto.lookingFor !== undefined)   data.lookingFor   = dto.lookingFor;
    if (dto.ageMin !== undefined)       data.ageMin       = dto.ageMin;
    if (dto.ageMax !== undefined)       data.ageMax       = dto.ageMax;
    if (dto.heightMinCm !== undefined)  data.heightMinCm  = dto.heightMinCm;
    if (dto.heightMaxCm !== undefined)  data.heightMaxCm  = dto.heightMaxCm;
    if (dto.distanceMi !== undefined)   data.distanceMi   = dto.distanceMi;
    if (dto.relationship !== undefined) data.relationship = dto.relationship;
    if (dto.drinks !== undefined)       data.drinks       = dto.drinks;
    if (dto.smokes !== undefined)       data.smokes       = dto.smokes;
    if (dto.exercise !== undefined)     data.exercise     = dto.exercise;
    if (dto.weed420 !== undefined)      data.weed420      = dto.weed420;
    if (dto.kids !== undefined)         data.kids         = dto.kids;
    if (dto.politics !== undefined)     data.politics     = dto.politics;
    if (dto.religion !== undefined)     data.religion     = dto.religion;
    if (dto.monogamy !== undefined)     data.monogamy     = dto.monogamy;
    if (dto.starSign !== undefined)     data.starSign     = dto.starSign;
    if (dto.interests !== undefined)    data.interests    = dto.interests;
    if (dto.showMeOnPlaces !== undefined) data.showMeOnPlaces = dto.showMeOnPlaces;

    return this.prisma.filters.update({ where: { userId }, data });
  }

  /** Internal — called by DiscoveryService too. */
  async getOrCreate(userId: string): Promise<Filters> {
    const existing = await this.prisma.filters.findUnique({ where: { userId } });
    if (existing) return existing;

    // Seed lookingFor from the profile (so the first feed uses the user's
    // stated preference) and let the rest fall to schema defaults.
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { lookingFor: true },
    });
    return this.prisma.filters.create({
      data: { userId, lookingFor: profile?.lookingFor ?? [] },
    });
  }
}
