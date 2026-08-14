import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import { PutFeedWeightsDto } from './dto/admin.dto';

/**
 * Discovery feed-weights live in a singleton `feed_config` row (id=1).
 * Tuning them here changes the ranking immediately on the next /discovery/feed
 * call — DiscoveryService re-reads on every request.
 */
@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  get() {
    return this.prisma.feedConfig.findUnique({ where: { id: 1 } });
  }

  async put(adminId: string, dto: PutFeedWeightsDto) {
    const before = await this.prisma.feedConfig.findUnique({ where: { id: 1 } });
    const data: Prisma.FeedConfigUpdateInput = {};
    if (dto.wRecency !== undefined)              data.wRecency             = dto.wRecency;
    if (dto.wMutualInterests !== undefined)      data.wMutualInterests     = dto.wMutualInterests;
    if (dto.wSameSpot !== undefined)             data.wSameSpot            = dto.wSameSpot;
    if (dto.wDistance !== undefined)             data.wDistance            = dto.wDistance;
    if (dto.wReciprocal !== undefined)           data.wReciprocal          = dto.wReciprocal;
    if (dto.wRecentlyShownPenalty !== undefined) data.wRecentlyShownPenalty = dto.wRecentlyShownPenalty;

    const row = await this.prisma.feedConfig.update({ where: { id: 1 }, data });
    await this.audit.log({ adminId, action: 'config.feed-weights.update', target: 'feed_config:1', before, after: dto });
    return row;
  }
}
