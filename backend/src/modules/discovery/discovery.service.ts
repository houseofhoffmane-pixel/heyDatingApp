import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { GeoService } from '../../common/geo/geo.service';
import { ProfileShaper, computeAge } from '../../common/profile/profile-shaper';
import { loadEnv } from '../../common/config/env';
import { FiltersService } from './filters.service';
import { FeedShownService } from './feed-shown.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { UpdateLocationDto } from './dto/location.dto';

interface CandidateRow {
  profile_id: string;
  user_id: string;
  last_active_at: Date;
  dob: Date;
  gender: string;
  relationship_intent: string | null;
  drinks: string | null;
  smokes: string | null;
  exercise: string | null;
  weed_420: string | null;
  kids: string | null;
  politics: string | null;
  religion: string | null;
  monogamy: string | null;
  star_sign: string | null;
  dist_m: number;
  they_liked_me: boolean;
  interest_ids: string[] | null;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly shaper: ProfileShaper,
    private readonly filters: FiltersService,
    private readonly feedShown: FeedShownService,
  ) {}

  // ── PUT /me/location ─────────────────────────────────────────

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw ApiError.badRequest('PROFILE_NOT_FOUND', 'Complete your profile first.');
    }
    await this.geo.setProfileLocation(profile.id, dto.lat, dto.lng);
    return { ok: true };
  }

  // ── GET /discovery/feed ──────────────────────────────────────

  async feed(viewerId: string, query: FeedQueryDto) {
    const filters = await this.filters.getOrCreate(viewerId);

    // Viewer needs a profile (gender) + a location for the feed to mean
    // anything. The frontend handles each empty case with a different
    // screen, so we return distinct `meta.reason` codes.
    const viewer = await this.prisma.profile.findUnique({
      where: { userId: viewerId },
      select: { id: true, gender: true },
    });
    if (!viewer?.gender) {
      return emptyFeed('profile_incomplete');
    }
    const myLocation = await this.viewerLocation(viewerId);
    if (!myLocation) {
      return emptyFeed('no_location');
    }

    // Decode cursor (simple offset for v1; see comment in cursor() helper).
    const offset = decodeCursor(query.cursor);

    // Hard-filter SQL: nearest-first, ~500 candidates max.
    const candidates = await this.fetchCandidates(viewerId);

    if (candidates.length === 0) {
      return emptyFeed('out_of_radius');
    }

    // App-side enum-array filters. Empty array on the filters row means
    // "no constraint". Candidate-null means "they didn't say" — we keep
    // them (don't exclude unknowns), matching the spec's null-omit posture.
    const passedArrayFilters = candidates.filter((c) => matchesArrayFilters(c, filters));

    if (passedArrayFilters.length === 0) {
      return emptyFeed('no_matches');
    }

    // Interest filter: if the viewer specified interest slugs, the candidate
    // must share at least one (we look up slugs → ids).
    let postFiltered = passedArrayFilters;
    if (filters.interests.length > 0) {
      const matchingIds = await this.prisma.interest.findMany({
        where: { slug: { in: filters.interests } },
        select: { id: true },
      });
      const wanted = new Set(matchingIds.map((r) => r.id));
      postFiltered = passedArrayFilters.filter((c) => (c.interest_ids ?? []).some((id) => wanted.has(id)));
      if (postFiltered.length === 0) return emptyFeed('no_matches');
    }

    // ── score ─────────────────────────────────────────────────
    // 5-term ranking now (was 6 in the spots/events version — dropped
    // `same_spot_now` since there are no venues).
    const weights = await this.loadWeights();
    const myInterestIds = await this.myInterestIds(viewerId);
    const shown = await this.feedShown.readMany(viewerId, postFiltered.map((c) => c.user_id));

    const radiusM = filters.distanceMi * 1609.34;

    const scored = postFiltered.map((c) => {
      const mutualInterests = (c.interest_ids ?? []).filter((id) => myInterestIds.has(id)).length;
      const score =
        weights.wRecency * recencyScore(c.last_active_at) +
        weights.wMutualInterests * Math.min(mutualInterests / 6, 1) +
        weights.wDistance * Math.max(0, 1 - c.dist_m / Math.max(radiusM, 1)) +
        weights.wReciprocal * (c.they_liked_me ? 1 : 0) -
        weights.wRecentlyShownPenalty * Math.min((shown.get(c.user_id) ?? 0) / 5, 1);
      return { row: c, score };
    });

    scored.sort((a, b) => b.score - a.score || a.row.user_id.localeCompare(b.row.user_id));

    const page = scored.slice(offset, offset + query.limit);
    const more = offset + query.limit < scored.length;

    // Mark this page as shown so the recency penalty applies next time.
    await this.feedShown.markShown(viewerId, page.map((s) => s.row.user_id));

    const shaped = await Promise.all(
      page.map(async (s) => {
        const distMi = s.row.dist_m / 1609.34;
        const loaded = await this.shaper.loadFull(s.row.user_id);
        if (!loaded?.profile) return null;
        return {
          ...(await this.shaper.toPublic({
            user: loaded.user,
            profile: loaded.profile,
            viewerDistanceMi: distMi,
          })),
          theyLikedYou: s.row.they_liked_me,
          _score: round(s.score, 3),
        };
      }),
    );

    return {
      data: shaped.filter(Boolean),
      meta: {
        cursor: more ? encodeCursor(offset + query.limit) : null,
        total: scored.length,
      },
    };
  }

  // ── GET /discovery/profile/:userId ───────────────────────────

  async profileDetail(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      throw ApiError.badRequest('SELF', 'Use /me to view your own profile.');
    }

    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
    });
    if (blocked) throw ApiError.notFound('NOT_FOUND', 'Profile not found.');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target || target.status === 'deleted' || target.status === 'banned') {
      throw ApiError.notFound('NOT_FOUND', 'Profile not found.');
    }
    if (target.status !== 'active') {
      // Onboarding not complete, or paused/hidden — either way not viewable.
      throw ApiError.forbidden('PROFILE_UNAVAILABLE', 'This profile isn\'t available right now.');
    }

    // Visibility gate: `liked_only` requires that they've liked me.
    // (spot_only visibility was removed when spots/events went away.)
    if (target.visibility === 'liked_only') {
      const theyLikedMe = await this.prisma.like.findFirst({
        where: { fromUserId: targetUserId, toUserId: viewerId },
        select: { id: true },
      });
      if (!theyLikedMe) throw ApiError.forbidden('VISIBILITY_BLOCKED', 'Profile not available.');
    }

    // Compute distance for display (rounded, never raw lat/lng).
    const myLoc = await this.viewerLocation(viewerId);
    const targetProfile = await this.prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { id: true },
    });
    let distMi: number | null = null;
    if (myLoc && targetProfile) {
      const rows = await this.prisma.$queryRaw<{ d: number }[]>`
        SELECT ST_Distance_Sphere(location, POINT(${myLoc.lng}, ${myLoc.lat})) AS d
        FROM profiles WHERE id = ${targetProfile.id}
      `;
      if (rows[0]?.d != null) distMi = rows[0].d / 1609.34;
    }

    const loaded = await this.shaper.loadFull(targetUserId);
    if (!loaded?.profile) throw ApiError.notFound('NOT_FOUND', 'Profile not found.');

    return this.shaper.toPublic({
      user: loaded.user,
      profile: loaded.profile,
      viewerDistanceMi: distMi,
    });
  }

  // ── helpers ──────────────────────────────────────────────────

  private async fetchCandidates(viewerId: string): Promise<CandidateRow[]> {
    // MySQL 8 rewrite (Sprint 3).
    //   - `= ANY(json_array)` → `JSON_CONTAINS(json_array, JSON_QUOTE(value))`
    //   - `EXTRACT(YEAR FROM AGE(dob))` → `TIMESTAMPDIFF(YEAR, dob, CURDATE())`
    //   - `ST_DWithin(a, b, m)` → `ST_Distance_Sphere(a, b) <= m`
    //   - `array_agg(...)` → `JSON_ARRAYAGG(...)` → `interest_ids` comes
    //     back as a JSON string; the code side parses it.
    const rows = await this.prisma.$queryRaw<Array<Omit<CandidateRow, 'interest_ids' | 'they_liked_me'> & {
      interest_ids: string | null;
      they_liked_me: number;
    }>>`
      WITH viewer AS (
        SELECT
          u.id           AS uid,
          u.dob          AS dob,
          p.gender       AS my_gender,
          p.location     AS my_location,
          f.looking_for  AS my_lf,
          f.age_min, f.age_max,
          f.height_min_cm, f.height_max_cm,
          f.distance_mi
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        JOIN filters  f ON f.user_id = u.id
        WHERE u.id = ${viewerId}
      )
      SELECT
        p.id                  AS profile_id,
        u.id                  AS user_id,
        u.last_active_at      AS last_active_at,
        u.dob                 AS dob,
        p.gender              AS gender,
        p.relationship_intent AS relationship_intent,
        p.drinks              AS drinks,
        p.smokes              AS smokes,
        p.exercise            AS exercise,
        p.weed_420            AS weed_420,
        p.kids                AS kids,
        p.politics            AS politics,
        p.religion            AS religion,
        p.monogamy            AS monogamy,
        p.star_sign           AS star_sign,
        ST_Distance_Sphere(p.location, viewer.my_location) AS dist_m,
        EXISTS (
          SELECT 1 FROM likes l
          WHERE l.from_user_id = u.id AND l.to_user_id = ${viewerId}
        ) AS they_liked_me,
        (SELECT JSON_ARRAYAGG(pi.interest_id) FROM profile_interests pi WHERE pi.profile_id = p.id) AS interest_ids
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      CROSS JOIN viewer
      WHERE u.status = 'active'
        AND u.id <> viewer.uid
        AND u.deleted_at IS NULL
        AND p.location IS NOT NULL
        AND viewer.my_location IS NOT NULL
        AND ST_Distance_Sphere(p.location, viewer.my_location) <= viewer.distance_mi * 1609.34
        AND u.dob IS NOT NULL
        AND TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) BETWEEN viewer.age_min AND viewer.age_max
        AND (p.height_cm IS NULL OR p.height_cm BETWEEN viewer.height_min_cm AND viewer.height_max_cm)
        AND (
          JSON_CONTAINS(viewer.my_lf, JSON_QUOTE(
            CASE p.gender
              WHEN 'woman'       THEN 'women'
              WHEN 'trans_woman' THEN 'women'
              WHEN 'man'         THEN 'men'
              WHEN 'trans_man'   THEN 'men'
              ELSE 'non-binary'
            END
          ))
          OR JSON_CONTAINS(viewer.my_lf, JSON_QUOTE('everyone'))
        )
        AND (
          JSON_CONTAINS(p.looking_for, JSON_QUOTE(
            CASE viewer.my_gender
              WHEN 'woman'       THEN 'women'
              WHEN 'trans_woman' THEN 'women'
              WHEN 'man'         THEN 'men'
              WHEN 'trans_man'   THEN 'men'
              ELSE 'non-binary'
            END
          ))
          OR JSON_CONTAINS(p.looking_for, JSON_QUOTE('everyone'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${viewerId} AND b.blocked_id = u.id)
             OR (b.blocker_id = u.id        AND b.blocked_id = ${viewerId})
        )
        AND NOT EXISTS (SELECT 1 FROM likes  l  WHERE l.from_user_id  = ${viewerId} AND l.to_user_id  = u.id)
        AND NOT EXISTS (SELECT 1 FROM passes ps WHERE ps.from_user_id = ${viewerId} AND ps.to_user_id = u.id)
        AND (
          u.visibility = 'everyone'
          OR (u.visibility = 'liked_only' AND EXISTS (
            SELECT 1 FROM likes l WHERE l.from_user_id = u.id AND l.to_user_id = ${viewerId}
          ))
        )
      ORDER BY dist_m ASC
      LIMIT 500
    `;

    // Normalise the MySQL-shaped result to CandidateRow:
    //   - JSON_ARRAYAGG returns a JSON string (or null on empty group)
    //   - EXISTS(...) comes back as 0/1
    return rows.map((r) => ({
      ...r,
      they_liked_me: !!r.they_liked_me,
      interest_ids: parseIdArray(r.interest_ids),
    }));
  }

  private async viewerLocation(userId: string): Promise<{ lat: number; lng: number } | null> {
    // POINT stored as (x=lng, y=lat); pull both back as scalars.
    const rows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(location) AS lat, ST_X(location) AS lng
      FROM profiles
      WHERE user_id = ${userId} AND location IS NOT NULL
    `;
    return rows[0] ?? null;
  }

  private async myInterestIds(viewerId: string): Promise<Set<string>> {
    const rows = await this.prisma.profileInterest.findMany({
      where: { profile: { userId: viewerId } },
      select: { interestId: true },
    });
    return new Set(rows.map((r) => r.interestId));
  }

  private async loadWeights() {
    const row = await this.prisma.feedConfig.findUnique({ where: { id: 1 } });
    if (row) return row;
    // Fall back to env defaults — DB row should always exist, this is just belts-and-braces.
    const env = loadEnv();
    return {
      wRecency: env.FEED_W_RECENCY,
      wMutualInterests: env.FEED_W_MUTUAL_INTERESTS,
      wDistance: env.FEED_W_DISTANCE,
      wReciprocal: env.FEED_W_RECIPROCAL,
      wRecentlyShownPenalty: env.FEED_W_RECENT_SHOWN_PENALTY,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────

function emptyFeed(reason: string) {
  return { data: [] as any[], meta: { cursor: null as string | null, total: 0, reason } };
}

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const off = Number(parsed?.off);
    if (!Number.isFinite(off) || off < 0) return 0;
    return off;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ off: offset }), 'utf8').toString('base64url');
}

/** 1.0 if active in last hour, decays linearly to 0 over 30 days. */
function recencyScore(lastActive: Date): number {
  const ms = Date.now() - lastActive.getTime();
  const hours = ms / 36e5;
  if (hours <= 1) return 1;
  const days = hours / 24;
  if (days >= 30) return 0;
  return Math.max(0, 1 - (days - 1 / 24) / 30);
}

function matchesArrayFilters(c: CandidateRow, filters: { relationship: string[]; drinks: string[]; smokes: string[]; exercise: string[]; weed420: string[]; kids: string[]; politics: string[]; religion: string[]; monogamy: string[]; starSign: string[] }): boolean {
  // Helper: pass if filter is empty OR candidate unset OR candidate ∈ filter.
  const ok = (filterValues: string[], candidateValue: string | null) =>
    filterValues.length === 0 || candidateValue == null || filterValues.includes(candidateValue);

  return (
    ok(filters.relationship, c.relationship_intent) &&
    ok(filters.drinks, c.drinks) &&
    ok(filters.smokes, c.smokes) &&
    ok(filters.exercise, c.exercise) &&
    ok(filters.weed420, c.weed_420) &&
    ok(filters.kids, c.kids) &&
    ok(filters.politics, c.politics) &&
    ok(filters.religion, c.religion) &&
    ok(filters.monogamy, c.monogamy) &&
    ok(filters.starSign, c.star_sign)
  );
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * `JSON_ARRAYAGG` returns a JSON string when the driver decodes it
 * (the mysql client returns TEXT for JSON in raw queries). Parse
 * defensively — an empty group is NULL, a populated group is a
 * `["uuid","uuid",…]` string or (with some driver configs) an
 * already-parsed array.
 */
function parseIdArray(v: string | string[] | null | undefined): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
