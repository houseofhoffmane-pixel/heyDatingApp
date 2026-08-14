import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';

/**
 * Bidirectional invisibility. Once A blocks B:
 *   - Any active match between them flips to `unmatched`.
 *   - All discovery/places/events/chat queries already filter against
 *     `blocks` (both directions) — the row here is enough.
 *
 * Per spec §10 the blocked party is never notified.
 */
@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw ApiError.badRequest('SELF_BLOCK', 'You can\'t block yourself.');
    }

    const target = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!target || target.status === 'deleted') {
      throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      });
      // End any active match between them — both sides lose the chat per §7.7.
      const [low, high] = blockerId < blockedId ? [blockerId, blockedId] : [blockedId, blockerId];
      await tx.match.updateMany({
        where: { userAId: low, userBId: high, status: MatchStatus.active },
        data: { status: MatchStatus.unmatched, unmatchedBy: blockerId },
      });
    });

    return { ok: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { ok: true };
  }

  /** Lists who I've blocked — the "blocked accounts" settings page. */
  async listMine(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: rows.map((r) => ({
        userId: r.blockedId,
        blockedAt: r.createdAt.toISOString(),
      })),
    };
  }
}
