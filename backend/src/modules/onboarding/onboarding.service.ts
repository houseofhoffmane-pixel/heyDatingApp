import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { ProfileShaper, computeAge, computeCompleteness } from '../../common/profile/profile-shaper';
import { PatchProfileDto } from './dto/patch-profile.dto';
import { SetInterestsDto } from './dto/set-interests.dto';
import { SetPromptsDto } from './dto/set-prompts.dto';
import { SetEmailPassDto } from './dto/set-email-pass.dto';

/**
 * Service for the /onboarding/* surface. Owns:
 *   - Partial profile upserts (PATCH /onboarding/profile)
 *   - Interest selection (3–6, replace-all semantics)
 *   - Prompt answers (1–3, replace-all semantics)
 *   - Email/password back-up login set
 *   - State probe (what's left before the user can submit for verification)
 *
 * Server-side rules enforced here, mirroring §7.1:
 *   - dob → age must be ≥ 18 (else 422 UNDERAGE)
 *   - age_confirmed must be true to count as "set"
 *   - bio ≤ 180 chars, prompt answer ≤ 140, looking_for ⊆ canonical set
 *   - All mandatory fields present before status can flip to `active` —
 *     handled in completeOnboarding() once the user finishes onboarding.
 *     The state endpoint previews the same readiness check.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shaper: ProfileShaper,
  ) {}

  // ── PATCH /onboarding/profile ────────────────────────────────

  async patchProfile(userId: string, dto: PatchProfileDto) {
    // 1) User-table fields (dob, age_confirmed) ─ validated and saved before
    // we touch the profile row.
    const userUpdate: { dob?: Date; ageConfirmed?: boolean } = {};
    if (dto.dob !== undefined) {
      const dob = parseDob(dto.dob);
      const age = computeAge(dob);
      if (age < 18) {
        throw ApiError.unprocessable('UNDERAGE', 'You must be 18 or older.', 'dob');
      }
      if (age > 110) {
        throw ApiError.unprocessable('DOB_INVALID', 'Birthday looks wrong.', 'dob');
      }
      userUpdate.dob = dob;
    }
    if (dto.ageConfirmed !== undefined) {
      userUpdate.ageConfirmed = dto.ageConfirmed;
    }
    if (Object.keys(userUpdate).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userUpdate });
    }

    // 2) Profile-table fields. Upsert because the row may not exist yet.
    const profileData = pickProfileData(dto);
    if (Object.keys(profileData).length > 0) {
      await this.prisma.profile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
    } else {
      // Make sure a profile row exists even if only user-fields were sent,
      // so subsequent state probes don't see "no profile".
      await this.prisma.profile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }

    await this.refreshCompletion(userId);
    return this.state(userId);
  }

  // ── POST /onboarding/interests ───────────────────────────────

  async setInterests(userId: string, dto: SetInterestsDto) {
    // Look up which IDs are real.
    const found = await this.prisma.interest.findMany({
      where: { id: { in: dto.interest_ids } },
      select: { id: true },
    });
    if (found.length !== dto.interest_ids.length) {
      throw ApiError.unprocessable('INTERESTS_UNKNOWN', 'Some interests are unknown.', 'interest_ids');
    }

    const profile = await this.ensureProfile(userId);

    // Replace-all semantics so the client doesn't have to diff.
    await this.prisma.$transaction([
      this.prisma.profileInterest.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.profileInterest.createMany({
        data: dto.interest_ids.map((interestId) => ({ profileId: profile.id, interestId })),
        skipDuplicates: true,
      }),
    ]);

    await this.refreshCompletion(userId);
    return this.state(userId);
  }

  // ── POST /onboarding/prompts ─────────────────────────────────

  async setPrompts(userId: string, dto: SetPromptsDto) {
    const promptIds = dto.items.map((it) => it.prompt_id);
    const valid = await this.prisma.prompt.findMany({
      where: { id: { in: promptIds }, active: true },
      select: { id: true },
    });
    if (valid.length !== promptIds.length) {
      throw ApiError.unprocessable('PROMPT_UNKNOWN', 'One or more prompts are not available.', 'items');
    }

    if (new Set(promptIds).size !== promptIds.length) {
      throw ApiError.unprocessable('PROMPT_DUPLICATE', 'You picked the same prompt more than once.', 'items');
    }

    for (const item of dto.items) {
      const trimmed = item.answer.trim();
      if (!trimmed) {
        throw ApiError.unprocessable('PROMPT_EMPTY', 'Prompt answers can\'t be empty.', 'items');
      }
    }

    const profile = await this.ensureProfile(userId);

    await this.prisma.$transaction([
      this.prisma.profilePrompt.deleteMany({ where: { profileId: profile.id } }),
      ...dto.items.map((it, idx) =>
        this.prisma.profilePrompt.create({
          data: {
            profileId: profile.id,
            promptId: it.prompt_id,
            answer: it.answer.trim(),
            position: idx,
          },
        }),
      ),
    ]);

    await this.refreshCompletion(userId);
    return this.state(userId);
  }

  // ── POST /onboarding/email-pass ──────────────────────────────

  async setEmailPass(userId: string, dto: SetEmailPassDto) {
    const lower = dto.email.toLowerCase();

    // Reject if another user already owns this email.
    const other = await this.prisma.user.findUnique({ where: { email: lower } });
    if (other && other.id !== userId) {
      throw ApiError.conflict('EMAIL_TAKEN', 'That email is already in use.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19 MB
      timeCost: 2,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: lower, passwordHash },
    });

    return { ok: true };
  }

  // ── GET /onboarding/state ────────────────────────────────────

  async state(userId: string) {
    const loaded = await this.shaper.loadFull(userId);
    if (!loaded) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

    const completeness = computeCompleteness(loaded.user, loaded.profile);
    const canActivate = completeness.missing.length === 0;

    return {
      status: loaded.user.status,
      canActivate,
      completeness,
      profile: loaded.profile
        ? {
            name: loaded.profile.name,
            gender: loaded.profile.gender,
            lookingFor: loaded.profile.lookingFor,
            relationshipIntent: loaded.profile.relationshipIntent,
            heightCm: loaded.profile.heightCm,
            bio: loaded.profile.bio,
            interestsCount: loaded.profile.interests.length,
            promptsCount: loaded.profile.prompts.length,
            photosCount: loaded.profile.photos.length,
          }
        : null,
      account: {
        dob: loaded.user.dob?.toISOString().slice(0, 10) ?? null,
        ageConfirmed: loaded.user.ageConfirmed,
        email: loaded.user.email ?? null,
      },
    };
  }

  // ── Shared: enforce mandatory fields and flip status ─────────

  /**
   * Web-flow completion. Once the user has all required fields set
   * (name / dob / age_confirmed / gender / lookingFor / relationshipIntent
   * / heightCm / bio + 3-6 interests + ≥1 prompt + ≥2 photos) they flip
   * straight to `active` and become discoverable.
   */
  async completeOnboardingOrThrow(userId: string) {
    const loaded = await this.shaper.loadFull(userId);
    if (!loaded) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

    const completeness = computeCompleteness(loaded.user, loaded.profile);
    if (completeness.missing.length > 0) {
      throw ApiError.unprocessable(
        'ONBOARDING_INCOMPLETE',
        `Still missing: ${completeness.missing.join(', ')}`,
      );
    }

    // Only advance from onboarding — never demote an already-active account.
    await this.prisma.user.updateMany({
      where: { id: userId, status: 'onboarding' },
      data: { status: 'active' },
    });
    return { status: 'active' as const };
  }

  // ── internal helpers ─────────────────────────────────────────

  private async ensureProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.profile.create({ data: { userId } });
    }
    return profile;
  }

  /** Recompute and persist completion_pct. Best-effort: failures aren't fatal. */
  private async refreshCompletion(userId: string) {
    const loaded = await this.shaper.loadFull(userId);
    if (!loaded?.profile) return;
    const c = computeCompleteness(loaded.user, loaded.profile);
    await this.prisma.profile
      .update({
        where: { userId },
        data: { completionPct: c.percent },
      })
      .catch((err) => this.logger.warn(`refreshCompletion failed: ${err}`));
  }
}

// ─────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────

function parseDob(iso: string): Date {
  // Accept YYYY-MM-DD (date-only). Build a UTC Date at midnight to avoid TZ drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw ApiError.unprocessable('DOB_FORMAT', 'Birthday must be YYYY-MM-DD.', 'dob');
  const [, y, mo, d] = m;
  const dob = new Date(Date.UTC(+y, +mo - 1, +d));
  if (Number.isNaN(dob.getTime())) {
    throw ApiError.unprocessable('DOB_INVALID', 'Birthday is not a real date.', 'dob');
  }
  return dob;
}

function pickProfileData(dto: PatchProfileDto): Record<string, any> {
  const data: Record<string, any> = {};
  if (dto.name !== undefined)              data.name = dto.name.trim();
  if (dto.gender !== undefined)            data.gender = dto.gender;
  if (dto.genderCustom !== undefined)      data.genderCustom = dto.genderCustom.trim();
  if (dto.lookingFor !== undefined)        data.lookingFor = dto.lookingFor;
  if (dto.relationshipIntent !== undefined) data.relationshipIntent = dto.relationshipIntent;
  if (dto.heightCm !== undefined)          data.heightCm = dto.heightCm;
  if (dto.bio !== undefined)               data.bio = dto.bio.trim();
  if (dto.job !== undefined)               data.job = dto.job.trim();
  if (dto.school !== undefined)            data.school = dto.school.trim();
  if (dto.pronouns !== undefined)          data.pronouns = dto.pronouns.trim();
  if (dto.starSign !== undefined)          data.starSign = dto.starSign;
  if (dto.lifestyle) {
    if (dto.lifestyle.drinks !== undefined)   data.drinks = dto.lifestyle.drinks;
    if (dto.lifestyle.smokes !== undefined)   data.smokes = dto.lifestyle.smokes;
    if (dto.lifestyle.exercise !== undefined) data.exercise = dto.lifestyle.exercise;
    if (dto.lifestyle.weed420 !== undefined)  data.weed420 = dto.lifestyle.weed420;
  }
  if (dto.values) {
    if (dto.values.kids !== undefined)     data.kids = dto.values.kids;
    if (dto.values.politics !== undefined) data.politics = dto.values.politics;
    if (dto.values.religion !== undefined) data.religion = dto.values.religion;
    if (dto.values.monogamy !== undefined) data.monogamy = dto.values.monogamy;
  }
  return data;
}
