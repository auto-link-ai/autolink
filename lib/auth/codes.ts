import 'server-only';
import { randomInt } from 'node:crypto';
import { getSettings } from '@/lib/config/settings';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { phoneCodesRepository, type ActivationDetails, type Challenge } from '@/lib/db/repositories/phoneCodes';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { VERIFICATION_CODE, type PhoneCodePurpose } from '@/lib/domain/constants';
import { isWhatsAppConfigured, sendWhatsAppTemplate } from '@/lib/notifications/whatsapp';
import { hashForKey } from '@/lib/security/ipHash';
import { sameDigest, secretDigest } from '@/lib/security/pin';
import { generateChallengeId } from '@/lib/tags/generate';
import { toAsciiDigits } from '@/lib/validation/digits';

/**
 * WhatsApp verification codes: proof that whoever is typing holds the phone.
 *
 * A code is 6 random digits, valid 10 minutes, 5 tries, usable once. Only its
 * HMAC is stored. Each send is a paid message, so every one counts against the
 * number, the sticker, the address and a daily total (settings, rule 5).
 *
 * Sending is returned as a `deliver` function: activation sends at once, while
 * "forgot PIN" sends after the response so that a number with no account (a
 * decoy, never sent) answers in the same time as a real one.
 */
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const CODE_PATTERN = new RegExp(`^\\d{${VERIFICATION_CODE.length}}$`);

/** The Meta "Authentication" template (copy-code button) is set up. */
export function codesConfigured(): boolean {
  return isWhatsAppConfigured() && Boolean(process.env.WHATSAPP_CODE_TEMPLATE_NAME?.trim());
}

/** Codes can be issued — for real, or outside production printed in the server console. */
export function codesAvailable(): boolean {
  return codesConfigured() || process.env.NODE_ENV !== 'production';
}

function codeDigest(challengeId: string, code: string): string {
  return secretDigest('code', `${challengeId}:${code}`);
}

function newCode(): string {
  return String(randomInt(0, 10 ** VERIFICATION_CODE.length)).padStart(VERIFICATION_CODE.length, '0');
}

function expiry(now: Date): Date {
  return new Date(now.getTime() + VERIFICATION_CODE.ttlMinutes * 60_000);
}

/** Every limit is counted, even once one has refused: a refused request still spends budget. */
async function withinSendLimits(phone: string, tagId: string | null, ipHash: string): Promise<boolean> {
  const settings = await getSettings();
  const hits = [
    rateLimitsRepository.hit(`code:phone:${hashForKey('phone', phone)}`, settings.codesPerPhonePerDay, DAY_MS),
    rateLimitsRepository.hit(`code:ip:${ipHash}`, settings.codesPerIpPerHour, HOUR_MS),
    rateLimitsRepository.hit('code:all', settings.codesPerDay, DAY_MS),
  ];
  if (tagId) hits.push(rateLimitsRepository.hit(`code:tag:${tagId}`, settings.codesPerTagPerDay, DAY_MS));
  return (await Promise.all(hits)).every((result) => result.allowed);
}

/** The "send it again" button is refused for a minute after each send. */
function startResendCooldown(challengeId: string) {
  return rateLimitsRepository.hit(`code:resend:${challengeId}`, 1, VERIFICATION_CODE.resendSeconds * 1000);
}

/** True once WhatsApp accepted the message (or, outside production, once it is printed). */
async function deliverCode(phone: string, code: string): Promise<boolean> {
  if (!codesConfigured()) {
    console.info(`[codes] WhatsApp codes are not configured — code for …${phone.slice(-2)}: ${code}`);
    return true;
  }
  const result = await sendWhatsAppTemplate({
    template: process.env.WHATSAPP_CODE_TEMPLATE_NAME,
    to: phone,
    // Authentication templates take the code twice: the text and the copy button.
    body: [code],
    buttonSuffix: code,
  });
  if (result.status !== 'SKIPPED') {
    // Counted for the admin (each one is a paid message): the outcome only, never the number or the code.
    await notificationAttemptsRepository
      .recordOther({ kind: 'system' }, {
        purpose: 'CODE',
        userId: null,
        channel: 'WHATSAPP',
        status: result.status,
        error: result.status === 'FAILED' ? result.error : null,
      })
      .catch((error: unknown) => console.error('[codes] recording a send failed:', error instanceof Error ? error.message : error));
  }
  return result.status === 'SENT';
}

export type IssueResult =
  | { ok: true; challengeId: string; deliver: () => Promise<boolean> }
  | { ok: false; reason: 'rate_limited' | 'unavailable' };

export async function issueCode(input: {
  phone: string;
  purpose: PhoneCodePurpose;
  ipHash: string;
  tagId?: string | null;
  details?: ActivationDetails | null;
  decoy?: boolean;
  now?: Date;
}): Promise<IssueResult> {
  if (!codesAvailable()) return { ok: false, reason: 'unavailable' };
  const tagId = input.tagId ?? null;
  if (!(await withinSendLimits(input.phone, tagId, input.ipHash))) return { ok: false, reason: 'rate_limited' };

  const challengeId = generateChallengeId();
  const code = newCode();
  const decoy = Boolean(input.decoy);
  await phoneCodesRepository.create({
    publicId: challengeId,
    phone: input.phone,
    purpose: input.purpose,
    tagId,
    details: input.details ?? null,
    codeHash: codeDigest(challengeId, code),
    decoy,
    expiresAt: expiry(input.now ?? new Date()),
  });
  await startResendCooldown(challengeId);
  return { ok: true, challengeId, deliver: () => (decoy ? Promise.resolve(true) : deliverCode(input.phone, code)) };
}

export type ResendResult =
  | { ok: true; challenge: Challenge; deliver: () => Promise<boolean> }
  | { ok: false; reason: 'expired' | 'too_soon' | 'rate_limited' | 'unavailable' };

export async function resendCode(challengeId: string, purpose: PhoneCodePurpose, ipHash: string): Promise<ResendResult> {
  if (!codesAvailable()) return { ok: false, reason: 'unavailable' };
  const challenge = await phoneCodesRepository.findLive(challengeId, purpose);
  if (!challenge) return { ok: false, reason: 'expired' };
  if (!(await startResendCooldown(challengeId)).allowed) return { ok: false, reason: 'too_soon' };
  if (!(await withinSendLimits(challenge.phone, challenge.tagId, ipHash))) return { ok: false, reason: 'rate_limited' };

  const code = newCode();
  if (!(await phoneCodesRepository.replaceCode(challengeId, purpose, codeDigest(challengeId, code), expiry(new Date())))) {
    return { ok: false, reason: 'expired' };
  }
  return {
    ok: true,
    challenge,
    deliver: () => (challenge.decoy ? Promise.resolve(true) : deliverCode(challenge.phone, code)),
  };
}

export type CheckResult = { ok: true; challenge: Challenge } | { ok: false; reason: 'invalid' | 'expired' };

/**
 * One try at a code. On success the challenge is used up at once, before the
 * caller acts on it, so two submissions racing with the right code cannot both
 * go through. What it proves — the phone, the sticker — comes back from the
 * stored challenge, never from the form.
 */
export async function checkCode(challengeId: string, purpose: PhoneCodePurpose, typed: string): Promise<CheckResult> {
  const code = toAsciiDigits(typed).replace(/\s/g, '');
  if (!CODE_PATTERN.test(code)) return { ok: false, reason: 'invalid' };

  const challenge = await phoneCodesRepository.spendAttempt(challengeId, purpose, VERIFICATION_CODE.maxAttempts);
  if (!challenge) return { ok: false, reason: 'expired' };
  if (challenge.decoy || !sameDigest(codeDigest(challengeId, code), challenge.codeHash)) {
    return { ok: false, reason: 'invalid' };
  }
  if (!(await phoneCodesRepository.consume(challengeId))) return { ok: false, reason: 'expired' };
  const { codeHash: _codeHash, ...proven } = challenge;
  return { ok: true, challenge: proven };
}
