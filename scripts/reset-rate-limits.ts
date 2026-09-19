/**
 * pnpm reset:ratelimits
 *
 * Clears the rate-limit counters so a repeated e2e run is not locked out by
 * the admin login limiter it tripped on the previous run.
 *
 * Refuses to run unless MONGODB_DB_NAME looks like a test database: these
 * counters are an abuse defence, never something to clear in production.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';

async function main() {
  const dbName = process.env.MONGODB_DB_NAME ?? '';
  if (!/(_e2e|_test)$/.test(dbName)) {
    throw new Error(`Refusing to clear rate limits on "${dbName || '(unset)'}": only *_e2e or *_test databases.`);
  }

  const removed = await rateLimitsRepository.clearAll();
  console.log(`✓ cleared ${removed} rate-limit counter(s) in ${dbName}`);
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
