import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Deliberately does NOT $connect() at module init. Prisma opens the
 * connection lazily on the first query anyway, and the eager connect
 * turned every startup failure into a hard panic before Nest could even
 * hand the /health route back to Passenger — which then thrashes
 * spawning workers and 503s all traffic.
 *
 * With lazy connect, the app boots even if DB is unreachable;
 * /health/db returns false and DB endpoints throw a clean
 * PrismaClientInitializationError we can read in the log.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
