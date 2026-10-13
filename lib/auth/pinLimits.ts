import 'server-only';
import { getSettings } from '@/lib/config/settings';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { hashForKey } from '@/lib/security/ipHash';

/**
 * PIN tries are counted per phone number — every number, with or without an
 * account, so the answer never tells which numbers are registered — in two
 * windows: a burst limit and a daily one (settings, rule 5). A WhatsApp reset
 * or an admin unlock clears them: the owner proved who they are.
 */
const QUARTER_MS = 15 * 60_000;
const DAY_MS = 24 * 3_600_000;

function keys(phone: string): [string, string] {
  const id = hashForKey('phone', phone);
  return [`pin:15m:${id}`, `pin:day:${id}`];
}

/** Counts one try; false once either window is spent. Counted before the PIN is checked. */
export async function spendPinAttempt(phone: string): Promise<boolean> {
  const settings = await getSettings();
  const [quarter, day] = keys(phone);
  const results = await Promise.all([
    rateLimitsRepository.hit(quarter, settings.pinAttemptsPer15Min, QUARTER_MS),
    rateLimitsRepository.hit(day, settings.pinAttemptsPerDay, DAY_MS),
  ]);
  return results.every((result) => result.allowed);
}

export async function clearPinAttempts(phone: string): Promise<void> {
  await rateLimitsRepository.clear(keys(phone));
}
