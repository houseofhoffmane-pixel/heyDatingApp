import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

/**
 * PrismaClient wired to a mariadb pool we create ourselves.
 *
 * Boot probe (see git log) proved that raw mariadb.createConnection()
 * with `ssl: { rejectUnauthorized: false }` reaches Hostinger's
 * MySQL fine in ~100ms. But when the same ssl option is passed via
 * PrismaMariaDb's config, Prisma's pool never resolves and queries
 * time out — the adapter's config parser drops it silently.
 *
 * Fix: build the mariadb Pool ourselves (with all the tuning that
 * actually reaches Hostinger's DB), then hand the ready-made Pool to
 * PrismaMariaDb. This bypasses the adapter's config coercion.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: mariadb.Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    const u = new URL(url);
    const host = u.hostname;
    const port = u.port ? Number(u.port) : 3306;
    const user = decodeURIComponent(u.username);
    const password = decodeURIComponent(u.password);
    const database = u.pathname.replace(/^\//, '');

    process.stderr.write(
      `[prisma] building mariadb pool → ${user}@${host}:${port}/${database} ` +
      `(connectTimeout=30s, ssl=true, poolLimit=5)\n`,
    );

    const pool = mariadb.createPool({
      host, port, user, password, database,
      connectionLimit: 5,
      connectTimeout: 30_000,
      acquireTimeout: 20_000,
      // SSL required by Hostinger's managed MySQL for cross-tier
      // connections; self-signed cert on their end so
      // rejectUnauthorized:false accepts it.
      ssl: { rejectUnauthorized: false } as any,
      // Managed MySQL with caching_sha2_password sometimes rejects
      // the first auth attempt without this.
      allowPublicKeyRetrieval: true,
    });
    this.pool = pool;

    // Warm the pool + prove it works before Nest starts wiring
    // controllers. Fire-and-forget — the app boots regardless.
    pool.getConnection()
      .then(async (c) => {
        try {
          const r = await c.query('SELECT 1 AS ok');
          process.stderr.write(`[prisma] pool warm OK — ${JSON.stringify(r)}\n`);
        } finally {
          c.release();
        }
      })
      .catch((e) => {
        process.stderr.write(`[prisma] pool warm FAILED: ${e?.code ?? ''} ${e?.message ?? e}\n`);
      });

    const adapter = new PrismaMariaDb(pool as any);
    super({ adapter } as any);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    try { await this.pool.end(); } catch { /* ignore */ }
  }
}
