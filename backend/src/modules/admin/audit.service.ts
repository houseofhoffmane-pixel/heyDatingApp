import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Append-only ledger of every admin mutation. Every admin service calls
 * `log()` after the underlying write so the audit row only exists for
 * actions that actually persisted.
 *
 * `target` is a stable string like `place:<uuid>` so audits join naturally
 * across resources (you can ask "what did admin X do to place Y" without
 * a polymorphic relation).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(opts: {
    adminId: string;
    action: string;
    target: string;
    before?: unknown;
    after?: unknown;
  }) {
    await this.prisma.adminAudit.create({
      data: {
        adminId: opts.adminId,
        action: opts.action,
        target: opts.target,
        before: opts.before === undefined ? Prisma.JsonNull : (opts.before as Prisma.InputJsonValue),
        after: opts.after === undefined ? Prisma.JsonNull : (opts.after as Prisma.InputJsonValue),
      },
    });
  }
}
