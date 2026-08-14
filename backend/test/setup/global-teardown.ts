/**
 * Runs ONCE after the whole suite. Nothing to do — each spec closes its
 * own app + redis + sockets in afterAll, so dangling handles don't keep
 * Jest from exiting.
 */
export default async function globalTeardown() {
  /* no-op */
}
