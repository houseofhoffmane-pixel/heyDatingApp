import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * PrismaClient with the mariadb driver adapter (Node-native MySQL
 * driver). This bypasses Prisma's Rust Query Engine entirely — the
 * Rust engine PANICs with "timer has gone away" on Hostinger's shared
 * hosting regardless of engineType, a known tokio/libuv interop bug.
 * Driver adapters (preview in Prisma 5.24+) let us run queries through
 * pure Node code so the Rust runtime never enters the picture.
 *
 * mariadb npm driver speaks MySQL wire protocol — works against MySQL
 * 8, MariaDB, and everything in between.
 *
 * Connection is lazy: this class inherits PrismaClient's lazy $connect
 * behaviour, so the app boots even if DB is unreachable; /health then
 * reports the real error on first query.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      // Guard rail — env.ts should have set a placeholder if DB_* env
      // vars weren't provided. This just avoids a cryptic mariadb error.
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    const adapter = new PrismaMariaDb(url);
    super({ adapter } as any);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
