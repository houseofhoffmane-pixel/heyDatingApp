/**
 * Runs ONCE before the entire test suite.
 *
 * - Loads .env.test
 * - Applies any pending migrations to hey_test (MySQL as of Sprint 3)
 * - Re-runs the seed so interests + prompts exist
 *
 * Per-test cleanup (truncate mutable tables) lives in setup/db.ts and is
 * invoked from each spec's beforeEach.
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  const env = { ...process.env };

  // Apply migrations (idempotent; no-op when up-to-date).
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });

  // Seed catalog data (idempotent).
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', env });
}
