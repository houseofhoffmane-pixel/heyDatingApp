import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * PrismaClient wired to Neon's serverless Postgres via WebSocket.
 *
 * Why not the standard `pg` driver? Hostinger's Node.js tier can't
 * reliably open raw TCP to any external database. Neon's serverless
 * driver goes over WebSocket on port 443, which Hostinger's app tier
 * CAN reach — same as any HTTPS request.
 */

// Configure the Neon driver's WebSocket constructor before any adapter
// creates a connection. Runs once at module import.
neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }

    // In Prisma 6's @prisma/adapter-neon, the constructor takes a
    // Neon PoolConfig (not an already-built Pool). Passing the URL
    // as connectionString here lets the adapter own the pool
    // lifecycle — no manual pool.end() needed on shutdown.
    const adapter = new PrismaNeon({ connectionString: url });
    super({ adapter } as any);

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
  }
}
