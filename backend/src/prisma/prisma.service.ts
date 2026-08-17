import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * PrismaClient with the mariadb driver adapter (Node-native MySQL
 * driver, no Rust engine). Bypasses the Rust engine's "timer has gone
 * away" panic on Hostinger.
 *
 * IMPORTANT — connection settings tuned for shared MySQL hosting
 * (Hostinger's `auth-db2146.hstgr.io`):
 *
 *   - connectTimeout: 30_000 — mariadb's default is 1s which is too
 *     tight for cross-tier TLS/DNS setup on shared hosts. Requests
 *     just hang in the pool if the connect fails silently.
 *   - acquireTimeout: 20_000 — same reason.
 *   - allowPublicKeyRetrieval: true — some managed MySQLs need this
 *     for caching_sha2_password authentication.
 *   - connectionLimit: 5 — modest pool for a free-tier plan.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    const u = new URL(url);
    const host = u.hostname;
    const port = u.port ? Number(u.port) : 3306;
    const user = decodeURIComponent(u.username);
    const database = u.pathname.replace(/^\//, '');

    // Log the resolved connection (never the password) so a failed
    // connection has visible context.
    process.stderr.write(
      `[prisma] mariadb adapter → ${user}@${host}:${port}/${database}` +
      ` (connectTimeout=30s, poolLimit=5)\n`,
    );

    const adapter = new PrismaMariaDb({
      host,
      port,
      user,
      password: decodeURIComponent(u.password),
      database,
      connectionLimit: 5,
      connectTimeout: 30_000,
      acquireTimeout: 20_000,
      // Managed MySQL with caching_sha2_password sometimes rejects the
      // first auth attempt without this — safe to enable.
      allowPublicKeyRetrieval: true,
    } as any);

    super({ adapter } as any);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
