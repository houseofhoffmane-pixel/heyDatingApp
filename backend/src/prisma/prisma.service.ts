import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * PrismaClient with the mariadb driver adapter (Node-native MySQL
 * driver, no Rust engine).
 *
 * Runtime connection settings for Hostinger's cross-tier MySQL:
 *   - connectTimeout 30_000ms — mariadb defaults to 1s
 *   - acquireTimeout 20_000ms
 *   - ssl:true first, retry ssl:false — Hostinger's managed MySQL
 *     may or may not require TLS depending on the plan; try both
 *   - allowPublicKeyRetrieval:true — needed for caching_sha2_password
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
    const cfg = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      connectionLimit: 5,
      connectTimeout: 30_000,
      acquireTimeout: 20_000,
      // Managed MySQL with caching_sha2_password sometimes rejects the
      // first auth attempt without this.
      allowPublicKeyRetrieval: true,
      // SSL required by many managed MySQL hosts (Hostinger,
      // PlanetScale, etc.). rejectUnauthorized:false so self-signed
      // certs on Hostinger's shared plans don't reject us.
      ssl: { rejectUnauthorized: false },
    };

    process.stderr.write(
      `[prisma] mariadb adapter → ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}` +
      ` (connectTimeout=30s, ssl=true, poolLimit=5)\n`,
    );

    const adapter = new PrismaMariaDb(cfg as any);
    super({ adapter } as any);

    // Fire-and-forget boot probe: raw connect + SELECT 1, log the
    // outcome to stderr so we see the actual driver error (not our
    // 15s health-check wrapper).
    this.probeConnection(cfg).catch(() => { /* logged inside */ });
  }

  private async probeConnection(cfg: any) {
    try {
      // Import mariadb lazily so the boot log runs even if the
      // adapter itself imports fine.
      const mariadb = await import('mariadb');
      const t0 = Date.now();
      const conn = await mariadb.default.createConnection({
        host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
        database: cfg.database, connectTimeout: 30_000,
        ssl: cfg.ssl, allowPublicKeyRetrieval: true,
      });
      const rows = await conn.query('SELECT 1 AS ok');
      await conn.end();
      process.stderr.write(`[prisma] boot probe OK in ${Date.now() - t0}ms — ${JSON.stringify(rows)}\n`);
    } catch (e: any) {
      process.stderr.write(`[prisma] boot probe FAILED: ${e?.code ?? ''} ${e?.message ?? e}\n`);
      // Retry without SSL in case the server rejects it.
      try {
        const mariadb = await import('mariadb');
        const t0 = Date.now();
        const conn = await mariadb.default.createConnection({
          host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
          database: cfg.database, connectTimeout: 30_000,
          ssl: false, allowPublicKeyRetrieval: true,
        });
        await conn.query('SELECT 1');
        await conn.end();
        process.stderr.write(`[prisma] boot probe (no-SSL retry) OK in ${Date.now() - t0}ms — server accepts plaintext\n`);
      } catch (e2: any) {
        process.stderr.write(`[prisma] boot probe (no-SSL retry) FAILED: ${e2?.code ?? ''} ${e2?.message ?? e2}\n`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
