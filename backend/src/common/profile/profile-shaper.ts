import { Injectable } from '@nestjs/common';
import {
  Drinks, Exercise, Gender, Kids, Monogamy, Photo, PhotoStatus, Politics,
  Profile, ProfileInterest, ProfilePrompt, Prompt, Interest, Religion,
  RelationshipIntent, Smokes, StarSign, User, Weed420,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../modules/storage/storage.service';

// Required fields a profile needs before a user can move into
// `pending_verification`. The booleans are returned by getCompleteness()
// and feed both /onboarding/state and the completion_pct on the profile.
export interface Completeness {
  satisfied: Record<RequiredField, boolean>;
  missing: RequiredField[];
  required: Record<RequiredField, string>;
  percent: number;          // 0–100 — what we display in the Me card ring
}

export type RequiredField =
  | 'name'
  | 'dob'
  | 'ageConfirmed'
  | 'gender'
  | 'lookingFor'
  | 'relationshipIntent'
  | 'heightCm'
  | 'bio'
  | 'interests'    // ≥3
  | 'prompts'      // ≥1
  | 'photos';      // ≥2

const REQUIRED_LABELS: Record<RequiredField, string> = {
  name: 'first name',
  dob: 'birthday',
  ageConfirmed: '18+ confirmation',
  gender: 'gender',
  lookingFor: 'who you want to see',
  relationshipIntent: 'relationship intent',
  heightCm: 'height',
  bio: 'bio',
  interests: 'at least 3 interests',
  prompts: 'at least 1 prompt answer',
  photos: 'at least 2 photos',
};

// Optional fields contribute to the displayed completion %.
const OPTIONAL_KEYS = [
  'job', 'school', 'pronouns', 'starSign',
  'drinks', 'smokes', 'exercise', 'weed420',
  'kids', 'politics', 'religion', 'monogamy',
] as const;

type ProfileWithJoins = Profile & {
  interests: (ProfileInterest & { interest: Interest })[];
  prompts: (ProfilePrompt & { prompt: Prompt })[];
  photos: Photo[];
};

@Injectable()
export class ProfileShaper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Load profile + joins for a user. Returns null if no profile row yet. */
  async loadFull(userId: string): Promise<{ user: User; profile: ProfileWithJoins | null } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        interests: { include: { interest: true } },
        prompts: { include: { prompt: true }, orderBy: { position: 'asc' } },
        photos: { where: { status: PhotoStatus.approved }, orderBy: { position: 'asc' } },
      },
    });
    return { user, profile };
  }

  /**
   * Public profile shape returned to *other users*. Honors the null-omit
   * rule from §3.2: optional fields that are NULL are dropped from the
   * payload entirely so the client can render a sparse profile that still
   * looks complete.
   */
  async toPublic(opts: { user: User; profile: ProfileWithJoins | null; viewerDistanceMi?: number | null }) {
    const { user, profile, viewerDistanceMi } = opts;
    if (!profile) return null;

    const out: Record<string, any> = {
      id: profile.id,
      userId: user.id,
      name: profile.name,
      age: user.dob ? computeAge(user.dob) : null,
      gender: profile.gender,
      lookingFor: profile.lookingFor,
      relationshipIntent: profile.relationshipIntent,
      heightCm: profile.heightCm,
      bio: profile.bio,
      lastActiveAt: user.lastActiveAt.toISOString(),
    };

    // Optional fields — only include when non-null.
    if (profile.job)         out.job = profile.job;
    if (profile.school)      out.school = profile.school;
    if (profile.pronouns)    out.pronouns = profile.pronouns;
    if (profile.starSign)    out.starSign = profile.starSign;
    if (profile.drinks)      out.drinks = profile.drinks;
    if (profile.smokes)      out.smokes = profile.smokes;
    if (profile.exercise)    out.exercise = profile.exercise;
    if (profile.weed420)     out.weed420 = profile.weed420;
    if (profile.kids)        out.kids = profile.kids;
    if (profile.politics)    out.politics = profile.politics;
    if (profile.religion)    out.religion = profile.religion;
    if (profile.monogamy)    out.monogamy = profile.monogamy;
    if (profile.genderCustom) out.genderCustom = profile.genderCustom;

    // Joins — interests, prompts, photos (signed read URLs).
    out.interests = profile.interests.map((pi) => ({
      id: pi.interest.id,
      slug: pi.interest.slug,
      label: pi.interest.label,
      category: pi.interest.category,
    }));

    out.prompts = profile.prompts.map((p) => ({
      id: p.id,
      position: p.position,
      prompt: { id: p.prompt.id, text: p.prompt.text },
      answer: p.answer,
    }));

    out.photos = await Promise.all(
      profile.photos.map(async (ph) => ({
        id: ph.id,
        position: ph.position,
        isMain: ph.isMain,
        url: await this.storage.signRead(ph.s3Key),
      })),
    );

    if (viewerDistanceMi !== undefined && viewerDistanceMi !== null) {
      out.distanceMi = Math.round(viewerDistanceMi * 10) / 10;
    }

    return out;
  }

  /**
   * Owner view — includes everything `toPublic` does, plus account/status
   * fields the user needs to see about themselves. Used by /me.
   */
  async toOwner(opts: { user: User; profile: ProfileWithJoins | null }) {
    const { user, profile } = opts;
    const completeness = computeCompleteness(user, profile);
    const base = (await this.toPublic({ user, profile })) ?? {
      id: null,
      userId: user.id,
      name: null,
    };

    return {
      ...base,
      account: {
        status: user.status,
        visibility: user.visibility,
        email: user.email ?? null,
        phoneCountryCode: user.countryCode,
        dob: user.dob?.toISOString().slice(0, 10) ?? null,
        ageConfirmed: user.ageConfirmed,
      },
      completeness,
    };
  }

}

// ─────────────────────────────────────────────────────────────
// Pure helpers (exported so OnboardingService / AuthService can reuse)
// ─────────────────────────────────────────────────────────────

export function computeAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function computeCompleteness(user: User, profile: ProfileWithJoins | null): Completeness {
  const satisfied: Record<RequiredField, boolean> = {
    name: !!profile?.name?.trim(),
    dob: !!user.dob,
    ageConfirmed: user.ageConfirmed,
    gender: !!profile?.gender,
    lookingFor: Array.isArray(profile?.lookingFor) && (profile!.lookingFor as unknown[]).length > 0,
    relationshipIntent: !!profile?.relationshipIntent,
    heightCm: !!profile?.heightCm && profile.heightCm > 0,
    bio: !!profile?.bio?.trim() && profile.bio.trim().length >= 8,
    interests: !!profile && profile.interests.length >= 3,
    prompts: !!profile && profile.prompts.length >= 1 && profile.prompts.every((p) => p.answer.trim().length > 0),
    photos: !!profile && profile.photos.length >= 2,
  };

  const missing = (Object.keys(satisfied) as RequiredField[]).filter((k) => !satisfied[k]);

  // Display percent — required fields are 70% of the bar, optional 30%.
  const requiredKeys = Object.keys(satisfied) as RequiredField[];
  const requiredSatisfied = requiredKeys.filter((k) => satisfied[k]).length;
  const requiredFrac = requiredSatisfied / requiredKeys.length;

  let optionalSatisfied = 0;
  if (profile) {
    for (const k of OPTIONAL_KEYS) {
      if ((profile as any)[k] != null) optionalSatisfied++;
    }
  }
  const optionalFrac = optionalSatisfied / OPTIONAL_KEYS.length;

  const percent = Math.round((requiredFrac * 0.7 + optionalFrac * 0.3) * 100);

  return {
    satisfied,
    missing,
    required: REQUIRED_LABELS,
    percent,
  };
}

/** Type helpers re-exported so OnboardingService can build typed updates. */
export const ENUM_GENDER: Gender[] = ['woman', 'man', 'non_binary', 'trans_woman', 'trans_man', 'genderfluid', 'other'];
export const ENUM_RELATIONSHIP: RelationshipIntent[] = ['longterm', 'longterm_open', 'short_open', 'short', 'figuring_out', 'friends'];
export const ENUM_STAR_SIGN: StarSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
export const ENUM_DRINKS: Drinks[] = ['often', 'socially', 'rarely', 'never'];
export const ENUM_SMOKES: Smokes[] = ['regularly', 'socially', 'trying_to_quit', 'never'];
export const ENUM_EXERCISE: Exercise[] = ['daily', 'few_week', 'sometimes', 'never'];
export const ENUM_WEED: Weed420[] = ['yes', 'sometimes', 'never'];
export const ENUM_KIDS: Kids[] = ['want', 'have_want_more', 'have_done', 'dont_want', 'open', 'not_sure'];
export const ENUM_POLITICS: Politics[] = ['left', 'moderate', 'right', 'not_political', 'rather_not_say'];
export const ENUM_RELIGION: Religion[] = ['agnostic', 'atheist', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'spiritual', 'other'];
export const ENUM_MONOGAMY: Monogamy[] = ['monogamous', 'monogamish', 'non_monogamous', 'figuring'];
// Canonical text[] values per spec §3.2. Hyphenated to match the spec
// (the Gender enum uses an underscore because postgres enum identifiers
// can't have hyphens; this is plain text[] so we keep the spec form).
export const ENUM_LOOKING_FOR = ['women', 'men', 'non-binary', 'everyone'] as const;
