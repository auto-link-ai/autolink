/**
 * pnpm backfill:service-until
 *
 * Gives an end of service to stickers linked before service periods existed:
 * `servicePeriodMonths` (settings) after the day each was linked. Until this
 * runs those stickers keep working with no end date. Run it once right after
 * deploying. Safe to run repeatedly: a sticker that has an end is left alone.
 *
 * A sticker linked more than the period ago ends at once — it shows "not
 * available" to strangers and its owner sees "Renew" on their dashboard.
 */
import { getSettings } from '@/lib/config/settings';
import { disconnectFromDatabase } from '@/lib/db/connect';
import { tagsRepository } from '@/lib/db/repositories/tags';

async function main() {
  const { servicePeriodMonths } = await getSettings();
  const updated = await tagsRepository.backfillServiceUntil({ kind: 'system' }, servicePeriodMonths);
  console.log(
    updated === 0
      ? '✓ nothing to do: every linked sticker already has an end of service'
      : `✓ dated ${updated} sticker(s): ${servicePeriodMonths} months after each was linked`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('✗', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
