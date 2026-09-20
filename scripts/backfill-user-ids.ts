/**
 * pnpm backfill:user-ids
 *
 * Gives a `publicUserId` to customer accounts created before the field
 * existed. The admin addresses an account by that id, so an account without
 * one cannot be opened. Safe to run repeatedly: accounts that already have an
 * id are left alone.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { usersRepository } from '@/lib/db/repositories/users';

async function main() {
  const updated = await usersRepository.backfillPublicIds();
  console.log(
    updated === 0
      ? '✓ nothing to do: every account already has a public id'
      : `✓ gave a public id to ${updated} account(s)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
