/**
 * pnpm seed — idempotent. Safe to run repeatedly.
 *
 * 1. Syncs every collection's indexes (incl. TTL indexes).
 * 2. Upserts the 58 wilayas.
 * 3. Creates the settings singleton with schema defaults.
 * 4. Writes PLACEHOLDER delivery fees if none exist yet (replace in /admin/settings).
 * 5. Creates one admin user if that email does not exist yet.
 *
 * Runs under `tsx --conditions=react-server` so `server-only` modules load.
 * All data access goes through repositories, like the rest of the app.
 */
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { disconnectFromDatabase } from '@/lib/db/connect';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { syncAllIndexes } from '@/lib/db/repositories/maintenance';
import { settingsRepository } from '@/lib/db/repositories/settings';
import { wilayasRepository } from '@/lib/db/repositories/wilayas';
import { hashSecret } from '@/lib/security/password';
import { WILAYAS } from './data/wilayas';

/**
 * PLACEHOLDER — not real courier prices. Written once so the order flow has
 * something to compute with; set the real per-wilaya fees in /admin/settings.
 */
const PLACEHOLDER_FEE = { home: 800, stopdesk: 500 } as const;

const seedEnv = z.object({
  SEED_ADMIN_EMAIL: z.email().optional(),
  ADMIN_ALERT_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

async function main() {
  const env = seedEnv.parse({
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || undefined,
    ADMIN_ALERT_EMAIL: process.env.ADMIN_ALERT_EMAIL || undefined,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || undefined,
  });

  const indexed = await syncAllIndexes();
  console.log(`✓ indexes synced (${indexed.length} collections)`);

  const inserted = await wilayasRepository.upsertAll(WILAYAS);
  console.log(`✓ wilayas: ${WILAYAS.length} present (${inserted} new)`);

  const settings = await settingsRepository.getOrCreateGlobal();
  console.log(
    `✓ settings: unit price ${settings.unitPriceDzd} ${settings.currencyLabel}, retention ${settings.messageRetentionDays} days`,
  );

  const feesWritten = await settingsRepository.setDeliveryFeesIfEmpty(
    WILAYAS.map((w) => ({ wilayaCode: w.code, ...PLACEHOLDER_FEE })),
  );
  console.log(
    feesWritten
      ? `! delivery fees: PLACEHOLDER ${PLACEHOLDER_FEE.home}/${PLACEHOLDER_FEE.stopdesk} written for all wilayas — set real fees in /admin/settings`
      : '✓ delivery fees: already configured, left unchanged',
  );

  const adminEmail = env.SEED_ADMIN_EMAIL ?? env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) {
    console.log('- admin: skipped (set SEED_ADMIN_EMAIL or ADMIN_ALERT_EMAIL)');
    return;
  }

  const wasGenerated = !env.SEED_ADMIN_PASSWORD;
  const password = env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');
  const { created } = await adminUsersRepository.createIfMissing({
    email: adminEmail,
    passwordHash: await hashSecret(password),
    role: 'ADMIN',
  });

  if (!created) {
    console.log(`✓ admin: ${adminEmail} already exists, password unchanged`);
  } else if (wasGenerated) {
    console.log(`✓ admin: created ${adminEmail}`);
    console.log(`  Generated password (shown once, store it now): ${password}`);
  } else {
    console.log(`✓ admin: created ${adminEmail} with SEED_ADMIN_PASSWORD`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('✗ seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
