import { Injectable } from '@nestjs/common';
import { ReportStatus, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { NotificationsService } from '../notifications/notifications.service';
import { TokensService } from '../auth/tokens.service';
import { AuditService } from './audit.service';
import {
  ListReportsDto, ActionReportDto, ActionVerificationDto, BanUserDto,
} from './dto/admin.dto';

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
  ) {}

  // ── Reports queue ────────────────────────────────────────────

  async listReports(dto: ListReportsDto) {
    const cursor = dto.cursor ? new Date(dto.cursor) : null;
    if (dto.cursor && Number.isNaN(cursor?.getTime() ?? NaN)) {
      throw ApiError.badRequest('CURSOR_INVALID', 'Bad cursor.');
    }

    const rows = await this.prisma.report.findMany({
      where: {
        status: dto.status ?? ReportStatus.pending,
        ...(cursor ? { createdAt: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit + 1,
    });
    const hasMore = rows.length > dto.limit;
    const page = hasMore ? rows.slice(0, dto.limit) : rows;
    return {
      data: page,
      meta: { cursor: hasMore && page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null },
    };
  }

  async actionReport(adminId: string, id: string, dto: ActionReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw ApiError.notFound('REPORT_NOT_FOUND', 'Report not found.');
    if (report.status !== ReportStatus.pending) {
      throw ApiError.badRequest('ALREADY_ACTIONED', 'Already actioned.');
    }

    // Side effects per action.
    if (dto.action === 'ban' && report.targetType === 'profile') {
      await this.banUserInner(adminId, report.targetId, dto.note);
    }
    if (dto.action === 'warn' && report.targetType === 'profile') {
      await this.notifications.fanOut(
        report.targetId,
        'admin.warning',
        { reportId: report.id, note: dto.note },
        { push: { title: 'a heads-up from hey', body: dto.note?.slice(0, 140) ?? 'please review our community guidelines.' } },
      ).catch(() => undefined);
    }
    if (dto.action === 'remove') {
      if (report.targetType === 'spot') {
        await this.prisma.place.update({ where: { id: report.targetId }, data: { active: false } });
      } else if (report.targetType === 'event') {
        await this.prisma.event.update({ where: { id: report.targetId }, data: { active: false } });
      } else if (report.targetType === 'profile') {
        await this.banUserInner(adminId, report.targetId, dto.note);
      }
    }

    const newStatus =
      dto.action === 'dismiss' ? ReportStatus.dismissed :
      dto.action === 'warn'    ? ReportStatus.reviewed :
                                  ReportStatus.actioned;

    await this.prisma.report.update({
      where: { id },
      data: { status: newStatus, reviewedBy: adminId, reviewNote: dto.note ?? null },
    });

    await this.audit.log({
      adminId, action: `report.${dto.action}`, target: `report:${id}`,
      before: report, after: { status: newStatus, note: dto.note },
    });

    return { id, status: newStatus };
  }

  // ── Verifications manual queue ───────────────────────────────

  async listManualVerifications() {
    // "Manual" = rejected with 3 attempts, not yet manually reviewed.
    const rows = await this.prisma.verification.findMany({
      where: { status: VerificationStatus.rejected, attempt: { gte: 3 }, reviewedBy: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { include: { profile: { select: { name: true } } } } },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.profile?.name,
        attempt: r.attempt,
        rejectReason: r.rejectReason,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async actionVerification(adminId: string, id: string, dto: ActionVerificationDto) {
    const v = await this.prisma.verification.findUnique({ where: { id } });
    if (!v) throw ApiError.notFound('VERIFICATION_NOT_FOUND', 'Verification not found.');

    const newStatus = dto.action === 'approve' ? VerificationStatus.approved : VerificationStatus.rejected;
    await this.prisma.$transaction(async (tx) => {
      await tx.verification.update({
        where: { id },
        data: { status: newStatus, reviewedBy: adminId, rejectReason: dto.reason ?? v.rejectReason },
      });
      if (newStatus === VerificationStatus.approved) {
        await tx.user.updateMany({
          where: { id: v.userId, status: UserStatus.pending_verification },
          data: { status: UserStatus.active },
        });
      }
    });

    // Notification for the user.
    await this.notifications.fanOut(
      v.userId,
      newStatus === VerificationStatus.approved ? 'verification.approved' : 'verification.rejected',
      { manualReview: true, reason: dto.reason },
      { respectQuietHours: false, push: {
          title: newStatus === VerificationStatus.approved ? 'you\'re verified' : 'verification didn\'t pass',
          body: newStatus === VerificationStatus.approved ? 'a little ✓ next to your name.' : (dto.reason ?? 'reach out if you need help.'),
        }},
    ).catch(() => undefined);

    await this.audit.log({
      adminId, action: `verification.${dto.action}`, target: `verification:${id}`,
      before: v, after: { status: newStatus, reason: dto.reason },
    });

    return { id, status: newStatus };
  }

  // ── Users ────────────────────────────────────────────────────

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: { include: { photos: { orderBy: { position: 'asc' } } } },
        verifications: { orderBy: { createdAt: 'desc' } },
        _count: {
          select: {
            likesGiven: true, likesReceived: true, matchesA: true, matchesB: true,
            reportsFiled: true, blocksGiven: true, blocksReceived: true,
          },
        },
      },
    });
    if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

    const reportsAgainst = await this.prisma.report.count({
      where: { targetType: 'profile', targetId: id },
    });

    return {
      user: {
        id: user.id,
        phone: user.phoneE164,
        email: user.email,
        status: user.status,
        visibility: user.visibility,
        createdAt: user.createdAt.toISOString(),
        deletedAt: user.deletedAt?.toISOString() ?? null,
        lastActiveAt: user.lastActiveAt.toISOString(),
        name: user.profile?.name,
      },
      counts: {
        likesGiven: user._count.likesGiven,
        likesReceived: user._count.likesReceived,
        matches: user._count.matchesA + user._count.matchesB,
        reportsFiled: user._count.reportsFiled,
        reportsAgainst,
        blocksGiven: user._count.blocksGiven,
        blocksReceived: user._count.blocksReceived,
      },
      verifications: user.verifications.map((v) => ({
        id: v.id,
        status: v.status,
        attempt: v.attempt,
        rejectReason: v.rejectReason,
        matchConfidence: v.matchConfidence,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  async banUser(adminId: string, id: string, dto: BanUserDto) {
    return this.banUserInner(adminId, id, dto.note);
  }

  async unbanUser(adminId: string, id: string) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');
    if (before.status !== UserStatus.banned) {
      throw ApiError.badRequest('NOT_BANNED', 'User isn\'t banned.');
    }
    await this.prisma.user.update({ where: { id }, data: { status: UserStatus.active } });
    await this.audit.log({ adminId, action: 'user.unban', target: `user:${id}`, before, after: { status: 'active' } });
    return { id, status: 'active' };
  }

  private async banUserInner(adminId: string, userId: string, note?: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.banned },
    });
    await this.tokens.revokeAllForUser(userId);
    // End any active match the banned user has.
    await this.prisma.match.updateMany({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
      data: { status: 'unmatched', unmatchedBy: userId },
    });
    await this.audit.log({
      adminId, action: 'user.ban', target: `user:${userId}`, before, after: { status: 'banned', note },
    });
    return { id: userId, status: 'banned' };
  }
}
