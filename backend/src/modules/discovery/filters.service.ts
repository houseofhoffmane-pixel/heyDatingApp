import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { PutFiltersDto } from './dto/filters.dto';

/**
 * Per-user discovery filters. First read after onboarding lazily creates
 * the row, seeding `lookingFor` from the profile so the user's stated
 * preference becomes the initial filter — subsequent PUTs are
 * authoritative overrides.
 *
 * The array fields (lookingFor, relationship, drinks, ...) are stored as
 * MySQL JSON columns; Prisma types them as `JsonValue`. This service
 * returns a normalized view where each JSON array is a plain `string[]`
 * so callers don't have to cast.
 */

export interface Filters {
  userId: string;
  lookingFor: string[];
  relationship: string[];
  drinks: string[];
  smokes: string[];
  exercise: string[];
  weed420: string[];
  kids: string[];
  politics: string[];
  religion: string[];
  monogamy: string[];
  starSign: string[];
  interests: string[];
  ageMin: number;
  ageMax: number;
  heightMinCm: number;
  heightMaxCm: number;
  distanceMi: number;
  showMeOnPlaces: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

    const updated = await this.prisma.filters.update({ where: { userId }, data });
    return normalize(updated);
  }

  /** Internal — called by DiscoveryService too. */
  async getOrCreate(userId: string): Promise<Filters> {
    const existing = await this.prisma.filters.findUnique({ where: { userId } });
    if (existing) return normalize(existing);

    // Seed lookingFor from the profile (so the first feed uses the user's
    // stated preference) and let the rest fall to empty JSON arrays.
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { lookingFor: true },
    });
    const created = await this.prisma.filters.create({
      data: {
        userId,
        lookingFor:   asStringArray(profile?.lookingFor),
        relationship: [],
        drinks:       [],
        smokes:       [],
        exercise:     [],
        weed420:      [],
        kids:         [],
        politics:     [],
        religion:     [],
        monogamy:     [],
        starSign:     [],
        interests:    [],
      },
    });
    return normalize(created);
  }
}

/** Every JSON column comes back typed as `Prisma.JsonValue`. Cast to string[]. */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  return [];
}

function normalize(row: {
  userId: string;
  lookingFor: Prisma.JsonValue; relationship: Prisma.JsonValue;
  drinks: Prisma.JsonValue; smokes: Prisma.JsonValue; exercise: Prisma.JsonValue;
  weed420: Prisma.JsonValue; kids: Prisma.JsonValue; politics: Prisma.JsonValue;
  religion: Prisma.JsonValue; monogamy: Prisma.JsonValue; starSign: Prisma.JsonValue;
  interests: Prisma.JsonValue;
  ageMin: number; ageMax: number;
  heightMinCm: number; heightMaxCm: number;
  distanceMi: number; showMeOnPlaces: boolean;
  createdAt: Date; updatedAt: Date;
}): Filters {
  return {
    userId:         row.userId,
    lookingFor:     asStringArray(row.lookingFor),
    relationship:   asStringArray(row.relationship),
    drinks:         asStringArray(row.drinks),
    smokes:         asStringArray(row.smokes),
    exercise:       asStringArray(row.exercise),
    weed420:        asStringArray(row.weed420),
    kids:           asStringArray(row.kids),
    politics:       asStringArray(row.politics),
    religion:       asStringArray(row.religion),
    monogamy:       asStringArray(row.monogamy),
    starSign:       asStringArray(row.starSign),
    interests:      asStringArray(row.interests),
    ageMin:         row.ageMin,
    ageMax:         row.ageMax,
    heightMinCm:    row.heightMinCm,
    heightMaxCm:    row.heightMaxCm,
    distanceMi:     row.distanceMi,
    showMeOnPlaces: row.showMeOnPlaces,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  };
}
