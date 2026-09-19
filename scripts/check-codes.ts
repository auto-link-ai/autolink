/**
 * pnpm check:codes <path/to/tags.csv>
 *
 * Phase 1 gate check: proves the plaintext activation codes from a downloaded
 * batch appear NOWHERE in the database, and that each tag stores an argon2id hash.
 * Exit code 1 on any leak.
 */
import { readFile } from 'node:fs/promises';
import { disconnectFromDatabase } from '@/lib/db/connect';
import { countArgon2idHashes, findStringOccurrences } from '@/lib/db/repositories/maintenance';
import { isValidActivationCodeShape } from '@/lib/validation/activationCode';
import { isValidTagIdShape } from '@/lib/validation/tagId';

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: pnpm check:codes <path/to/tags.csv>');

  const rows = (await readFile(file, 'utf8'))
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(','));
  const ids = rows.map((r) => r[0] ?? '').filter(isValidTagIdShape);
  const codes = rows.map((r) => r[1] ?? '').filter(isValidActivationCodeShape);
  if (codes.length === 0) throw new Error('No activation codes found in that CSV.');

  // Search for both the printed form and the bare 10 characters.
  const needles = [...codes, ...codes.map((c) => c.replace(/-/g, ''))];
  const hits = await findStringOccurrences(needles);
  const hashes = await countArgon2idHashes(ids);

  console.log(`Checked ${codes.length} codes across every collection.`);
  console.log(`Tags found: ${hashes.found}/${ids.length}; argon2id hashes: ${hashes.argon2id}/${hashes.found}`);
  if (Object.keys(hits).length > 0) {
    console.error('✗ PLAINTEXT CODES FOUND:', hits);
    process.exitCode = 1;
  } else if (hashes.found !== ids.length || hashes.argon2id !== hashes.found) {
    console.error('✗ Some tags are missing or not hashed with argon2id.');
    process.exitCode = 1;
  } else {
    console.log('✓ No plaintext activation code is stored anywhere in the database.');
  }
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
