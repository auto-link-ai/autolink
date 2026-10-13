import 'server-only';
import type { Locale } from '@/i18n/locales';
import { checkCode, issueCode, resendCode } from '@/lib/auth/codes';
import { replacePin } from '@/lib/auth/pinChange';
import { clearPinAttempts } from '@/lib/auth/pinLimits';
import { onboardingRepository } from '@/lib/db/repositories/onboarding';
import { phoneCodesRepository } from '@/lib/db/repositories/phoneCodes';
import { scannerTagsRepository } from '@/lib/db/repositories/tagsScanner';
import { usersRepository } from '@/lib/db/repositories/users';
import { maskPhone } from '@/lib/format/phone';
import { hashPin, verifyPin } from '@/lib/security/pin';
import { activationDetailsSchema, chosenBrand } from '@/lib/validation/activation';
import { fieldErrors } from '@/lib/validation/auth';
import { newPinProblem } from '@/lib/validation/pin';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import { carName } from '@/lib/vehicles/carName';
import { withinActivationLimit } from './claim';
import type { ActivationErrors, ActivationState } from './state';

/**
 * Activating a sticker, for someone who is not signed in — the founder's flow:
 * one screen (name, phone, car, PIN twice), then the WhatsApp code, then done.
 *
 * Nothing is created until the code proves the phone. The PIN is never stored
 * before that: the browser sends it again with the code. What the code proves
 * — the phone, the sticker, the details — comes back from the challenge, never
 * from the second form.
 */
type Fields = Record<'firstName' | 'lastName' | 'phone' | 'brand' | 'brandOther' | 'model' | 'pin' | 'pinConfirm' | 'tagId', string>;

function pinErrors(pin: string, confirm: string, phone: string | null): ActivationErrors | null {
  const problem = newPinProblem(pin, confirm, phone);
  if (!problem) return null;
  return problem === 'pin_mismatch' ? { pinConfirm: problem } : { pin: problem };
}

/** A sticker that can still be activated: free, and shaped like a sticker id. */
async function waitingSticker(tagId: string): Promise<string | null> {
  const publicTagId = normalizeTagIdInput(tagId);
  if (!publicTagId) return null;
  const tag = await scannerTagsRepository.findForScanner(publicTagId);
  return tag?.state === 'waiting' ? tag.publicTagId : null;
}

/** Screen 1: check everything, then send the code to the WhatsApp number given. */
export async function startActivation(form: Fields, locale: Locale, ipHash: string): Promise<ActivationState> {
  const parsed = activationDetailsSchema.safeParse({
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone,
    brand: chosenBrand(form.brand, form.brandOther),
    model: form.model,
  });
  const errors: ActivationErrors = parsed.success ? {} : fieldErrors(parsed.error);
  // An « Autre » brand left empty is reported on the field the owner typed in.
  if (errors.brand && form.brand === 'other') errors.brandOther = errors.brand;
  Object.assign(errors, pinErrors(form.pin, form.pinConfirm, parsed.success ? parsed.data.phone : null));
  if (!parsed.success || Object.keys(errors).length > 0) return { step: 'details', fieldErrors: errors };
  const details = parsed.data;

  // Before any message is paid for: the sticker must still be waiting.
  const publicTagId = await waitingSticker(form.tagId);
  if (!publicTagId) return { step: 'details', formError: 'invalid' };
  if (!(await withinActivationLimit(ipHash))) return { step: 'details', formError: 'rate_limited' };

  const issued = await issueCode({
    phone: details.phone,
    purpose: 'ACTIVATE',
    ipHash,
    tagId: publicTagId,
    details: { firstName: details.firstName, lastName: details.lastName, brand: details.brand, model: details.model, locale },
  });
  if (!issued.ok) {
    return { step: 'details', formError: issued.reason === 'unavailable' ? 'code_unavailable' : 'rate_limited' };
  }
  const delivered = await issued.deliver();
  return {
    step: 'code',
    challengeId: issued.challengeId,
    phoneHint: maskPhone(details.phone),
    ...(delivered ? {} : { formError: 'send_failed' }),
  };
}

export type FinishResult =
  | { ok: true; phone: string; publicTagId: string; car: string | null; pinUpdated: boolean }
  | { ok: false; state: ActivationState };

/**
 * Screen 2: the code proves the phone; then the account (new, or the one this
 * number already has) and the sticker with its car, together. A number that
 * already has an account gets the car added — and, when a different PIN was
 * typed, that PIN becomes the new one: the code just proved who they are.
 */
export async function finishActivation(input: {
  challengeId: string;
  code: string;
  pin: string;
  pinConfirm: string;
}): Promise<FinishResult> {
  const codeStep = (extra: Omit<Extract<ActivationState, { step: 'code' }>, 'step' | 'challengeId' | 'phoneHint'>, phone = '') => ({
    ok: false as const,
    state: { step: 'code' as const, challengeId: input.challengeId, phoneHint: maskPhone(phone), ...extra },
  });

  const live = await phoneCodesRepository.findLive(input.challengeId, 'ACTIVATE');
  if (!live) return codeStep({ formError: 'code_expired' });
  // Checked before the code, so a PIN typo never spends it.
  const pinProblem = pinErrors(input.pin, input.pinConfirm, live.phone);
  if (pinProblem) return codeStep({ fieldErrors: pinProblem }, live.phone);

  const checked = await checkCode(input.challengeId, 'ACTIVATE', input.code);
  if (!checked.ok) {
    return checked.reason === 'invalid'
      ? codeStep({ fieldErrors: { code: 'code_invalid' } }, live.phone)
      : codeStep({ formError: 'code_expired' }, live.phone);
  }
  const { phone, tagId, details } = checked.challenge;
  if (!tagId || !details) return codeStep({ formError: 'invalid' }, phone);

  let pinUpdated = false;
  const existing = await usersRepository.findForPinLogin(phone);
  if (existing && existing.status === 'ACTIVE' && !(await verifyPin(existing.pinHash, input.pin))) {
    pinUpdated = await replacePin(existing.id, phone, input.pin);
  }

  const result = await onboardingRepository.activate(
    { firstName: details.firstName, lastName: details.lastName, phone, pinHash: await hashPin(input.pin), locale: details.locale },
    tagId,
    { brand: details.brand, model: details.model, color: '', plateNumber: null, showDetailsPublicly: true },
  );
  if (!result.ok) return codeStep({ formError: 'invalid' }, phone);

  // The code proved the owner: earlier wrong PINs must not stop them signing in now.
  await clearPinAttempts(phone);
  return { ok: true, phone, publicTagId: tagId, car: carName(details), pinUpdated };
}

/** « Renvoyer le code »: only while the sticker is still waiting, within the send limits. */
export async function resendActivationCode(challengeId: string, ipHash: string): Promise<ActivationState> {
  const live = await phoneCodesRepository.findLive(challengeId, 'ACTIVATE');
  const base = { step: 'code' as const, challengeId, phoneHint: maskPhone(live?.phone ?? '') };
  if (!live) return { ...base, formError: 'code_expired' };
  if (!live.tagId || !(await waitingSticker(live.tagId))) return { ...base, formError: 'invalid' };

  const resent = await resendCode(challengeId, 'ACTIVATE', ipHash);
  if (!resent.ok) {
    const formError = { expired: 'code_expired', too_soon: 'code_too_soon', rate_limited: 'rate_limited', unavailable: 'code_unavailable' }[resent.reason];
    return { ...base, formError };
  }
  return (await resent.deliver()) ? { ...base, notice: 'resent' } : { ...base, formError: 'send_failed' };
}
