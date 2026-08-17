import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * PrismaClient with the mariadb driver adapter (Node-native MySQL
 * driver, no Rust engine). Prisma's Rust Query Engine PANICs with
 * "timer has gone away" on Hostinger's shared hosting regardless of
 * engineType — a known tokio/libuv interop bug. Driver adapters route
 * queries through pure Node code so the Rust runtime never enters
 * the picture.
 *
 * mariadb npm driver speaks MySQL wire protocol natively — works
 * against MySQL 8, MariaDB, and Hostinger's managed MySQL.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set — resolveDatabaseUrl() must run before PrismaService instantiates');
    }
    // Parse the mysql:// URL and hand mariadb a proper connection object.
    // Passing a URL string works in some adapter versions but the config
    // object is the stable API across Prisma 6.x.
    const u = new URL(url);
    const adapter = new PrismaMariaDb({
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      connectionLimit: 5,
    });
    super({ adapter } as any);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
