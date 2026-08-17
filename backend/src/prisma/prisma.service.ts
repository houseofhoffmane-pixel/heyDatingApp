import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

/**
 * PrismaClient wired to a mariadb pool we create ourselves.
 *
 * Boot probe (see git log) proved raw mariadb.createConnection() with
 * `ssl: { rejectUnauthorized: false }` reaches Hostinger's MySQL fine
 * in ~100ms. But when the same ssl option is passed via PrismaMariaDb's
 * config, Prisma's pool never resolves — the adapter's config parser
 * drops it silently.
 *
 * Fix: build the mariadb.Pool ourselves with all the tuning that
 * demonstrably works, then hand the ready-made Pool to PrismaMariaDb.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  // Assigned inside constructor via a helper below (has to happen
  // AFTER super()).
  private pool!: mariadb.Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    const pool = buildPool(url);
    const adapter = new PrismaMariaDb(pool as any);
    super({ adapter } as any);
    this.pool = pool;

    // Warm the pool + prove it works. Fire-and-forget.
    pool.getConnection()
      .then(async (c) => {
        try {
          const r = await c.query('SELECT 1 AS ok');
          process.stderr.write(`[prisma] pool warm OK — ${JSON.stringify(r)}\n`);
        } finally {
          c.release();
        }
      })
      .catch((e: any) => {
        process.stderr.write(`[prisma] pool warm FAILED: ${e?.code ?? ''} ${e?.message ?? e}\n`);
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    try { await this.pool.end(); } catch { /* ignore */ }
  }
}

function buildPool(url: string): mariadb.Pool {
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

  return mariadb.createPool({
    host, port, user, password, database,
    connectionLimit: 5,
    connectTimeout: 30_000,
    acquireTimeout: 20_000,
    ssl: { rejectUnauthorized: false } as any,
    allowPublicKeyRetrieval: true,
  });
}
