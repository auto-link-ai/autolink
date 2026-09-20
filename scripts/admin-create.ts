/**
 * pnpm admin:create <email> [ADMIN|SUPPORT]
 *
 * Creates another admin account and prints its password once. ADMIN can change
 * everything; SUPPORT can read the admin area but not change settings, tags or
 * customer accounts.
 *
 * Run it in your own terminal: the password is shown there and nowhere else.
 * It refuses an email that already has an account — use `pnpm admin:password`
 * to give that one a new password instead.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { auditLogsRepository } from '@/lib/db/repositories/auditLogs';
import { ADMIN_ROLES, type AdminRole } from '@/lib/domain/constants';
import { generateReadablePassword, hashSecret } from '@/lib/security/password';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRole(value: string | undefined): AdminRole {
  if (!value) return 'ADMIN';
  const role = value.trim().toUpperCase();
  if ((ADMIN_ROLES as readonly string[]).includes(role)) return role as AdminRole;
  throw new Error(`Unknown role "${value}". Use one of: ${ADMIN_ROLES.join(', ')}.`);
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Usage: pnpm admin:create <email> [ADMIN|SUPPORT]');
  if (!EMAIL_PATTERN.test(email)) throw new Error(`"${email}" is not an email address.`);
  const role = parseRole(process.argv[3]);

  const password = generateReadablePassword();
  const { created } = await adminUsersRepository.createIfMissing({
    email,
    passwordHash: await hashSecret(password),
    role,
  });
  if (!created) {
    throw new Error(`${email} already has an admin account. Use \`pnpm admin:password ${email}\` instead.`);
  }

  await auditLogsRepository.append(
    { kind: 'system' },
    { action: 'ADMIN_CREATE', targetType: 'adminUser', targetId: email, metadata: { role } },
  );

  console.log(`✓ Admin created: ${email} (${role})`);
  console.log('  Password (shown once, store it now):');
  console.log(`  ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
