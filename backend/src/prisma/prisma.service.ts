import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * PrismaClient wired to Neon's serverless Postgres via WebSocket.
 *
 * Why not the standard `pg` driver? Hostinger's Node.js tier can't
 * reliably open raw TCP to any external database (proved with MySQL
 * and Prisma's own Rust engine). Neon's serverless driver goes over
 * WebSocket on port 443, which Hostinger's app tier CAN reach — same
 * as any HTTPS request.
 *
 * Node's global fetch has WebSocket support in v22+, but we set
 * neonConfig.webSocketConstructor = ws to guarantee the driver works
 * on any Node 20+ host.
 */

// Configure the Neon driver's WebSocket constructor once at module
// load — before any Pool is created.
neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool!: Pool;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);
    super({ adapter } as any);
    this.pool = pool;

    // Log the target (never the password) so failures include context.
    const hostPart = url.split('@')[1]?.split('?')[0] ?? '?';
    process.stderr.write(`[prisma] Neon adapter → ${hostPart}\n`);

    // Warm probe: a real query at boot proves end-to-end connectivity
    // before Nest starts wiring controllers.
    this.$queryRaw`SELECT 1 AS ok`
      .then((r) => process.stderr.write(`[prisma] warm probe OK — ${JSON.stringify(r)}\n`))
      .catch((e: any) => process.stderr.write(`[prisma] warm probe FAILED: ${e?.message ?? e}\n`));
  }

  async onModuleDestroy() {
    await this.$disconnect();
    try { await this.pool.end(); } catch { /* ignore */ }
  }
}
