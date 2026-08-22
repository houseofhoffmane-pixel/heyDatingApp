import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

/**
 * PrismaClient wired to Neon's serverless Postgres via WebSocket.
 *
 * Why not the standard `pg` driver? Hostinger's Node.js tier can't
 * reliably open raw TCP to any external database. Neon's serverless
 * driver goes over WebSocket on port 443, which Hostinger's app tier
 * CAN reach — same as any HTTPS request.
 *
 * WebSocket source:
 *   - Node 22+: globalThis.WebSocket exists natively — use it.
 *   - Older Node: fall back to the `ws` package.
 * Detected at module load; Neon uses whatever we set.
 */

if (typeof globalThis.WebSocket === 'function') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
} else {
  // Late require so the ws dependency is only touched when actually
  // needed. Keeps Node 22+ boots quicker + avoids the ESM interop
  // pitfalls that older `ws` versions had on Node 18.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }

    // Prisma 6 @prisma/adapter-neon takes a Neon PoolConfig; the
    // adapter owns pool lifecycle so we don't manage it manually.
    const adapter = new PrismaNeon({ connectionString: url });
    super({ adapter } as any);

    const hostPart = url.split('@')[1]?.split('?')[0] ?? '?';
    const wsSrc = typeof globalThis.WebSocket === 'function' ? 'native WebSocket' : 'ws package';
    process.stderr.write(`[prisma] Neon adapter → ${hostPart} (via ${wsSrc})\n`);

    // Warm probe: real query at boot proves end-to-end connectivity
    // before Nest wires controllers.
    this.$queryRaw`SELECT 1 AS ok`
      .then((r) => process.stderr.write(`[prisma] warm probe OK — ${JSON.stringify(r)}\n`))
      .catch((e: any) => process.stderr.write(`[prisma] warm probe FAILED: ${e?.message ?? e}\n`));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
