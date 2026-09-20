import 'server-only';
import { getSettings } from '@/lib/config/settings';
import type { OwnerActor } from '@/lib/db/repositories/actor';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { verifySecret } from '@/lib/security/password';
import { normalizeActivationCodeInput } from '@/lib/validation/activationCode';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import type { VehicleInput } from '@/lib/validation/vehicle';

const HOUR_MS = 60 * 60 * 1000;

/**
 * `invalid` covers every "this pair does not open a sticker" case — unknown id,
 * wrong code, already claimed, suspended, lost. The caller shows one identical
 * message for all of them, so nobody can probe which stickers exist (rule 9).
 */
export type ClaimOutcome =
  | { ok: true; publicTagId: string }
  | { ok: false; reason: 'invalid' | 'locked' | 'rate_limited' };

export interface ClaimRequest {
  tagId: string;
  code: string;
  vehicle: VehicleInput;
}

/**
 * Claims a sticker for the signed-in customer: rate limit, then shape checks,
 * then the code, then the vehicle and the tag in one transaction.
 */
export async function claimTag(
  owner: OwnerActor,
  request: ClaimRequest,
  context: { ipHash: string },
): Promise<ClaimOutcome> {
  const settings = await getSettings();
  const hit = await rateLimitsRepository.hit(
    `activate:ip:${context.ipHash}`,
    settings.rateLimitActivationPerIpPerHour,
    HOUR_MS,
  );
  if (!hit.allowed) return { ok: false, reason: 'rate_limited' };

  // Shape first: a malformed id or code never reaches the database.
  const publicTagId = normalizeTagIdInput(request.tagId);
  const code = normalizeActivationCodeInput(request.code);
  if (!publicTagId || !code) return { ok: false, reason: 'invalid' };

  const tag = await ownerTagsRepository.findForActivation(publicTagId);
  if (!tag) return { ok: false, reason: 'invalid' };
  if (tag.lockedUntil && tag.lockedUntil > new Date()) return { ok: false, reason: 'locked' };

  const codeMatches = await verifySecret(tag.activationCodeHash, code);
  if (!codeMatches) {
    await ownerTagsRepository.registerFailedAttempt(publicTagId);
    return { ok: false, reason: 'invalid' };
  }
  // The code is right, but the sticker may already belong to someone: same answer.
  if (tag.status !== 'UNASSIGNED') return { ok: false, reason: 'invalid' };

  const claimed = await ownerTagsRepository.claim(owner, publicTagId, {
    brand: request.vehicle.brand,
    model: request.vehicle.model,
    color: request.vehicle.color,
    plateNumber: request.vehicle.plateNumber,
    showDetailsPublicly: request.vehicle.showDetailsPublicly,
  });
  return claimed.ok ? { ok: true, publicTagId } : { ok: false, reason: 'invalid' };
}
