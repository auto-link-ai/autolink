import 'server-only';
import { getSettings } from '@/lib/config/settings';
import type { OwnerActor } from '@/lib/db/repositories/actor';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { normalizeTagIdInput } from '@/lib/validation/tagId';

const HOUR_MS = 60 * 60 * 1000;

/**
 * `invalid` covers every "this does not link" case — unknown id, already
 * linked, deactivated, suspended, lost. The caller shows one message for all.
 */
export type ClaimOutcome = { ok: true; publicTagId: string } | { ok: false; reason: 'invalid' | 'rate_limited' };

/** Linked first, described later: the dashboard then asks for the car. */
const UNDESCRIBED_CAR = { brand: '', model: '', color: '', plateNumber: null, showDetailsPublicly: true };

/**
 * Links a sticker to the signed-in customer. Whoever scans a sticker that is
 * not linked yet and signs in becomes its owner: the packaging hides the QR
 * until delivery (CLAUDE.md rule 9). Rate limited per connection; the
 * repository's filter makes two accounts racing for one sticker end with one.
 */
export async function claimTag(owner: OwnerActor, tagId: string, context: { ipHash: string }): Promise<ClaimOutcome> {
  const settings = await getSettings();
  const hit = await rateLimitsRepository.hit(
    `activate:ip:${context.ipHash}`,
    settings.rateLimitActivationPerIpPerHour,
    HOUR_MS,
  );
  if (!hit.allowed) return { ok: false, reason: 'rate_limited' };

  // Shape first: a malformed id never reaches the database.
  const publicTagId = normalizeTagIdInput(tagId);
  if (!publicTagId) return { ok: false, reason: 'invalid' };

  const claimed = await ownerTagsRepository.claim(owner, publicTagId, UNDESCRIBED_CAR);
  return claimed.ok ? { ok: true, publicTagId } : { ok: false, reason: 'invalid' };
}
