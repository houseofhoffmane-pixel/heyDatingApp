import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
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
    // Active matches where I'm side A or B. Order: most-recent-message first,
    // then newest match first for ones with no messages yet (these power the
    // "new matches" strip in the UI — flagged via `isNew`).
    const matches = await this.prisma.match.findMany({
      where: {
        status: MatchStatus.active,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
    });

    if (matches.length === 0) return { data: [] };

    // Batch the "last message + unread" lookups with one query per side.
    const matchIds = matches.map((m) => m.id);
    const [lastMessages, unreadCounts] = await Promise.all([
      this.prisma.$queryRaw<{ match_id: string; id: string; body: string; kind: string; sender_id: string; created_at: Date }[]>`
        SELECT DISTINCT ON (m.match_id)
          m.match_id, m.id, m.body, m.kind::text AS kind, m.sender_id, m.created_at
        FROM "messages" m
        WHERE m.match_id = ANY(${matchIds}::uuid[])
        ORDER BY m.match_id, m.created_at DESC
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
                isVerified: true, // matches only exist between verified users
              }
            : { userId: otherUserId, name: 'user unavailable', age: null, mainPhotoUrl: null, isVerified: false },
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
