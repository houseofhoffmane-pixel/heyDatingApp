import { Injectable } from '@nestjs/common';
import { ReportTargetType, ReportReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimitService } from '../../common/ratelimit/ratelimit.service';
import { ApiError } from '../../common/errors/api-error';
import { loadEnv } from '../../common/config/env';
import { CreateReportDto } from './dto/create-report.dto';

/**
 * Profile/spot/event reporting. Detail length is enforced three ways:
 *   1. DTO `@Length(10, 280)`
 *   2. Service trim+check below (in case the DTO is bypassed in tests)
 *   3. DB CHECK constraint (`CHAR_LENGTH(TRIM(detail)) >= 10`)
 *
 * Target existence is validated against the right table per targetType so
 * the admin queue (Step 12) never sees reports against vanished entities.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async create(userId: string, dto: CreateReportDto) {
    const detail = dto.detail.trim();
    if (detail.length < 10) {
      throw ApiError.unprocessable('DETAIL_REQUIRED', 'Tell us what happened — at least 10 characters.', 'detail');
    }

    const rl = await this.rateLimit.hit(
      `reports:day:${userId}`,
      loadEnv().RL_REPORTS_PER_DAY,
      24 * 60 * 60,
    );
    if (!rl.allowed) {
      throw ApiError.tooManyRequests('REPORTS_RATE_LIMITED', 'You\'ve hit today\'s report limit.', rl.retryAfterSeconds);
    }

    await this.requireTargetExists(dto.targetType, dto.targetId, userId);

    const row = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: dto.targetType as ReportTargetType,
        targetId: dto.targetId,
        reason: dto.reason as ReportReason,
        detail,
      },
    });
    return { id: row.id, status: row.status, createdAt: row.createdAt.toISOString() };
  }

  /** A user can see their own report history (the "reported accounts" screen). */
  async listMine(userId: string) {
    const rows = await this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  private async requireTargetExists(targetType: string, targetId: string, reporterId: string) {
    if (targetType === 'profile') {
      if (targetId === reporterId) {
        throw ApiError.badRequest('SELF_REPORT', 'You can\'t report yourself.');
      }
      const exists = await this.prisma.user.findUnique({ where: { id: targetId } });
      if (!exists) throw ApiError.notFound('TARGET_NOT_FOUND', 'Profile not found.');
    } else if (targetType === 'spot') {
      const exists = await this.prisma.place.findUnique({ where: { id: targetId } });
      if (!exists) throw ApiError.notFound('TARGET_NOT_FOUND', 'Spot not found.');
    } else if (targetType === 'event') {
      const exists = await this.prisma.event.findUnique({ where: { id: targetId } });
      if (!exists) throw ApiError.notFound('TARGET_NOT_FOUND', 'Event not found.');
    }
  }
}
