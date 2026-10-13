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

/** Counts one activation attempt from this connection (settings, rule 5). */
export async function withinActivationLimit(ipHash: string): Promise<boolean> {
  const settings = await getSettings();
  const hit = await rateLimitsRepository.hit(`activate:ip:${ipHash}`, settings.rateLimitActivationPerIpPerHour, HOUR_MS);
  return hit.allowed;
}

/**
 * A signed-in owner adding a sticker to their account, with the car it goes
 * on. Whoever scans a sticker that is not linked yet becomes its owner: the
 * packaging hides the QR until delivery (CLAUDE.md rule 9). The repository's
 * filter makes two accounts racing for one sticker end with one.
 */
export async function claimTag(
  owner: OwnerActor,
  tagId: string,
  car: { brand: string; model: string },
  context: { ipHash: string },
): Promise<ClaimOutcome> {
  if (!(await withinActivationLimit(context.ipHash))) return { ok: false, reason: 'rate_limited' };

  // Shape first: a malformed id never reaches the database.
  const publicTagId = normalizeTagIdInput(tagId);
  if (!publicTagId) return { ok: false, reason: 'invalid' };

  const claimed = await ownerTagsRepository.claim(owner, publicTagId, {
    ...car,
    color: '',
    plateNumber: null,
    showDetailsPublicly: true,
  });
  return claimed.ok ? { ok: true, publicTagId } : { ok: false, reason: 'invalid' };
}
