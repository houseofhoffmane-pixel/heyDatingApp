import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Snapshot the spec calls for under /admin/metrics: DAU, matches/day,
 * check-ins/day, reports backlog. We add a few more (status breakdown,
 * top spots) since they're cheap from the same indexes.
 */
@Injectable()
export class AdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot() {
    const dayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau, matchesDay, checkinsDay, reportsPending, statusBreakdown, topSpots] =
      await Promise.all([
        this.prisma.user.count({ where: { lastActiveAt: { gte: dayAgo } } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
        this.prisma.match.count({ where: { createdAt: { gte: dayAgo } } }),
        this.prisma.checkin.count({ where: { checkedInAt: { gte: dayAgo } } }),
        this.prisma.report.count({ where: { status: 'pending' } }),
        this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.$queryRaw<{ id: string; label: string; count: number }[]>`
          SELECT p.id, p.label, COUNT(c.id)::int AS count
          FROM places p
          LEFT JOIN checkins c ON c.place_id = p.id AND c.checked_in_at >= ${dayAgo}
          GROUP BY p.id ORDER BY count DESC LIMIT 10
        `,
      ]);

    return {
      activity: { dau, wau, mau },
      day: {
        matches: matchesDay,
        checkins: checkinsDay,
      },
      backlog: {
        reportsPending,
      },
      usersByStatus: Object.fromEntries(statusBreakdown.map((r) => [r.status, r._count._all])),
      topSpotsToday: topSpots,
    };
  }
}
