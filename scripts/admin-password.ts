/**
 * pnpm admin:password <email>
 *
 * Gives an existing admin a new generated password and prints it once.
 * Use it when the password from `pnpm seed` was lost or mistyped. Run it in
 * your own terminal: the password is shown there and nowhere else.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { generateReadablePassword, hashSecret } from '@/lib/security/password';

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) throw new Error('Usage: pnpm admin:password <admin email>');

  const password = generateReadablePassword();
  const updated = await adminUsersRepository.setPasswordHash(email, await hashSecret(password));
  if (!updated) throw new Error(`No admin account uses ${email}.`);

  console.log(`✓ New password for ${email} (shown once, store it now):`);
  console.log(`  ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
