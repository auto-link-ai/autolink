/**
 * pnpm owners:purge-legacy [--yes]
 *
 * Owner accounts made before phone + PIN sign-in have no PIN, so they can no
 * longer sign in — and several share one test phone number, which would stop
 * the phone number from becoming unique. This deletes them exactly as the
 * admin's "delete account" does: their stickers go back to unassigned, their
 * cars, car books and messages go. Orders are kept.
 *
 * Without --yes it only counts. Run `pnpm seed` afterwards to rebuild indexes.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { adminCustomersRepository } from '@/lib/db/repositories/customersAdmin';

async function main() {
  const apply = process.argv.includes('--yes');
  const dbName = process.env.MONGODB_DB_NAME || 'autolink';
  const { accounts, stickers } = await adminCustomersRepository.purgeWithoutPin({ kind: 'system' }, apply);

  if (!apply) {
    console.log(`Database "${dbName}": ${accounts} account(s) without a PIN, holding ${stickers} sticker(s).`);
    if (accounts > 0) console.log('Nothing deleted. Run again with --yes to delete them.');
    return;
  }
  console.log(`✓ "${dbName}": deleted ${accounts} account(s) without a PIN; ${stickers} sticker(s) are unassigned again.`);
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
