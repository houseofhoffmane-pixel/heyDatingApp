import { Injectable } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { ProfileShaper } from '../../common/profile/profile-shaper';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shaper: ProfileShaper,
    private readonly storage: StorageService,
  ) {}

  // ── GET /matches ─────────────────────────────────────────────

  async list(userId: string) {
    // Active matches where I'm side A or B. Order: no-message matches
    // first (newest first — these power the "new matches" strip in the
    // UI, flagged via `isNew`), then matches that have exchanged messages
    // (most-recent-message first).
    //
    // Split into two queries because Prisma's `nulls: 'first'` orderBy
    // option is Postgres-only; MySQL would silently drop it.
    const baseWhere = {
      status: MatchStatus.active,
      OR: [{ userAId: userId }, { userBId: userId }],
    } as const;

    const [newMatches, chattedMatches] = await Promise.all([
      this.prisma.match.findMany({
        where: { ...baseWhere, lastMessageAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.match.findMany({
        where: { ...baseWhere, lastMessageAt: { not: null } },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ]);
    const matches = [...newMatches, ...chattedMatches];

    if (matches.length === 0) return { data: [] };

    // Batch the "last message + unread" lookups with one query per side.
    const matchIds = matches.map((m) => m.id);
    const [lastMessages, unreadCounts] = await Promise.all([
      // MySQL 8 has no DISTINCT ON — use ROW_NUMBER() to pick the newest
      // message per match, then keep rn = 1.
      this.prisma.$queryRaw<{ match_id: string; id: string; body: string; kind: string; sender_id: string; created_at: Date }[]>`
        SELECT match_id, id, body, kind, sender_id, created_at
        FROM (
          SELECT
            m.match_id, m.id, m.body, m.kind, m.sender_id, m.created_at,
            ROW_NUMBER() OVER (PARTITION BY m.match_id ORDER BY m.created_at DESC) AS rn
          FROM messages m
          WHERE m.match_id IN (${Prisma.join(matchIds)})
        ) t
        WHERE t.rn = 1
      `,
      this.prisma.message.groupBy({
        by: ['matchId'],
        where: {
          matchId: { in: matchIds },
          senderId: { not: userId },
          readAt: null,
        },
        _count: { _all: true },
      }),
    ]);

    const lastByMatch = new Map(lastMessages.map((m) => [m.match_id, m]));
    const unreadByMatch = new Map(unreadCounts.map((m) => [m.matchId, m._count._all]));

    const data = await Promise.all(
      matches.map(async (m) => {
        const otherUserId = m.userAId === userId ? m.userBId : m.userAId;
        const last = lastByMatch.get(m.id) ?? null;
        const unread = unreadByMatch.get(m.id) ?? 0;

        // Preview: name + age + main photo url.
        const loaded = await this.shaper.loadFull(otherUserId);
        let mainPhotoUrl: string | null = null;
        if (loaded?.profile?.photos.length) {
          const main = loaded.profile.photos.find((p) => p.isMain) ?? loaded.profile.photos[0];
          mainPhotoUrl = await this.storage.signRead(main.s3Key);
        }

        return {
          id: m.id,
          createdAt: m.createdAt.toISOString(),
          isNew: !m.lastMessageAt,
          lastMessageAt: m.lastMessageAt?.toISOString() ?? null,
          otherProfile: loaded?.profile
            ? {
                userId: otherUserId,
                name: loaded.profile.name,
                age: loaded.user.dob ? computeAge(loaded.user.dob) : null,
                mainPhotoUrl,
              }
            : { userId: otherUserId, name: 'user unavailable', age: null, mainPhotoUrl: null },
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                kind: last.kind,
                fromMe: last.sender_id === userId,
                createdAt: last.created_at.toISOString(),
              }
            : null,
          unread,
        };
      }),
    );

    return { data };
  }

  // ── DELETE /matches/:id ──────────────────────────────────────

  async unmatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw ApiError.notFound('MATCH_NOT_FOUND', 'Match not found.');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw ApiError.forbidden('NOT_PARTICIPANT', 'Not your match.');
    }
    if (match.status !== MatchStatus.active) {
      return { ok: true, status: match.status };
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.unmatched, unmatchedBy: userId },
    });

    // Spec §7.7: the other user is NOT notified explicitly; their UI will
    // hide the chat next time they refresh.
    return { ok: true, status: 'unmatched' as const };
  }
}

function computeAge(dob: Date): number {
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
}
