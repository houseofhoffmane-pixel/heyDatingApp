import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * PrismaClient wired to Neon's serverless Postgres via WebSocket.
 *
 * Uses the `ws` package explicitly (not Node's native WebSocket).
 * Node 22+ has a global WebSocket but Neon's serverless driver
 * needs the ws-style subprotocol/upgrade handling — the native
 * browser-compatible WebSocket hangs mid-handshake on Node 24 and
 * the pool never resolves.
 */
neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    if (!/[?&]sslmode=/.test(url)) {
      process.stderr.write(
        `[prisma] WARNING: DATABASE_URL has no sslmode parameter — Neon requires ?sslmode=require. ` +
        `Connection will likely fail.\n`,
      );
    }

    const adapter = new PrismaNeon({ connectionString: url });
    super({ adapter } as any);

    const hostPart = url.split('@')[1]?.split('?')[0] ?? '?';
    process.stderr.write(`[prisma] Neon adapter → ${hostPart} (via ws package)\n`);

    // Warm probe with a hard 15s timeout so we always get a resolution
    // in the log — either success, driver error, or a clear
    // "hung past 15s" that tells us the adapter never responded.
    Promise.race([
      this.$queryRaw`SELECT 1 AS ok`.then(
        (r) => `OK — ${JSON.stringify(r)}`,
        (e: any) => `FAILED: ${e?.message ?? e}`,
      ),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('TIMED OUT after 15s — driver hung mid-query'), 15_000),
      ),
    ]).then((result) => process.stderr.write(`[prisma] warm probe ${result}\n`));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
