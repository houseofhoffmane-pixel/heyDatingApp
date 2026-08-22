import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * PrismaClient wired to standard `pg` driver over TCP (port 5432).
 *
 * We tried the Neon WebSocket driver (@neondatabase/serverless) —
 * WebSocket upgrades hang on Hostinger's outbound proxy. Standard
 * `pg` over TCP to Neon's Postgres endpoint works because it's the
 * canonical driver path Neon supports.
 *
 * Requires Hostinger's app tier to allow outbound TCP to port 5432
 * on external hosts (Neon uses their own AWS endpoints, not local).
 * If that's blocked too, next escape hatch is Neon's HTTP-only
 * driver (fetch to /sql endpoint on Neon's REST API).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool!: Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    if (!/[?&]sslmode=/.test(url)) {
      process.stderr.write(
        `[prisma] WARNING: DATABASE_URL has no sslmode parameter — Neon requires ?sslmode=require.\n`,
      );
    }

    const pool = new Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });
    const adapter = new PrismaPg(pool as any);
    super({ adapter } as any);
    this.pool = pool;

    const hostPart = url.split('@')[1]?.split('?')[0] ?? '?';
    process.stderr.write(`[prisma] pg driver → ${hostPart}\n`);

    // Warm probe with hard timeout so the log always resolves.
    Promise.race([
      this.$queryRaw`SELECT 1 AS ok`.then(
        (r) => `OK — ${JSON.stringify(r)}`,
        (e: any) => `FAILED: ${e?.code ?? ''} ${e?.message ?? e}`,
      ),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('TIMED OUT after 15s — pg driver hung mid-query'), 15_000),
      ),
    ]).then((result) => process.stderr.write(`[prisma] warm probe ${result}\n`));
  }

  async onModuleDestroy() {
    await this.$disconnect();
    try { await this.pool.end(); } catch { /* ignore */ }
  }
}
