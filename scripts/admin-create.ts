/**
 * pnpm admin:create <email> [ADMIN|SUPPORT]
 *
 * Creates another admin account and prints its password once. ADMIN can change
 * everything; SUPPORT can read the admin area but not change settings, tags or
 * customer accounts.
 *
 * To choose the password instead of having one generated, put it in
 * ADMIN_PASSWORD (an environment variable, so it stays out of your shell
 * history and the process list). It is then never printed.
 *
 * Run it in your own terminal: a generated password is shown there and nowhere
 * else. It refuses an email that already has an account — use
 * `pnpm admin:password` to give that one a new password instead.
 */
import { disconnectFromDatabase } from '@/lib/db/connect';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { auditLogsRepository } from '@/lib/db/repositories/auditLogs';
import { ADMIN_ROLES, type AdminRole } from '@/lib/domain/constants';
import { generateReadablePassword, hashSecret } from '@/lib/security/password';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/auth';

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

  const chosen = process.env.ADMIN_PASSWORD?.trim();
  if (chosen && chosen.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`ADMIN_PASSWORD is too short: at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  const password = chosen || generateReadablePassword();

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
  if (chosen) {
    console.log('  Password: the one you supplied in ADMIN_PASSWORD.');
  } else {
    console.log('  Password (shown once, store it now):');
    console.log(`  ${password}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
