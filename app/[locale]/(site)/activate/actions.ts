'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { toLocale } from '@/i18n/locales';
import { claimTag } from '@/lib/activation/claim';
import { finishActivation, resendActivationCode, startActivation } from '@/lib/activation/onboard';
import { activationDonePath, type ActivationState } from '@/lib/activation/state';
import { getOwnerSession } from '@/lib/auth/session';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { carSchema, chosenBrand } from '@/lib/validation/activation';
import { fieldErrors } from '@/lib/validation/auth';

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * The activation screen, signed out: one form, three moves — the details (which
 * sends the WhatsApp code), « Renvoyer le code », and the code with the PIN
 * (which creates the account, links the sticker, signs in, and opens the
 * « C'est activé » page).
 */
export async function activationAction(prev: ActivationState, formData: FormData): Promise<ActivationState> {
  const locale = toLocale(formData.get('locale'));
  const step = text(formData, 'step');
  let done: string | null = null;
  try {
    const ipHash = hashIp(getClientIp(await headers()));
    if (step === 'resend') return await resendActivationCode(text(formData, 'challengeId'), ipHash);

    if (step === 'code') {
      const pin = text(formData, 'pin');
      const finished = await finishActivation({
        challengeId: text(formData, 'challengeId'),
        code: text(formData, 'code'),
        pin,
        pinConfirm: text(formData, 'pinConfirm'),
      });
      if (!finished.ok) return finished.state;
      try {
        await signIn('credentials', { phone: finished.phone, pin, redirect: false });
      } catch (error) {
        // The sticker is activated either way; signing in can be done from /login.
        console.error('[activate] sign-in after activation failed:', error instanceof Error ? error.message : error);
      }
      done = activationDonePath(locale, finished.publicTagId, finished.pinUpdated);
    } else {
      const fields = ['firstName', 'lastName', 'phone', 'brand', 'brandOther', 'model', 'pin', 'pinConfirm', 'tagId'] as const;
      const form = Object.fromEntries(fields.map((name) => [name, text(formData, name)])) as Record<(typeof fields)[number], string>;
      return await startActivation(form, locale, ipHash);
    }
  } catch (error) {
    console.error('[activate] failed:', error instanceof Error ? error.message : error);
    return { ...prev, formError: 'server_error' };
  }
  if (!done) return prev;
  // Outside the try: redirect() works by throwing.
  redirect(done);
}

/** Signed in already: just the car, and the sticker is theirs. */
export async function addStickerAction(_prev: ActivationState, formData: FormData): Promise<ActivationState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) return { step: 'details', formError: 'signed_out' };

  const car = carSchema.safeParse({ brand: chosenBrand(formData.get('brand'), formData.get('brandOther')), model: text(formData, 'model') });
  if (!car.success) {
    const errors = fieldErrors<'brand' | 'model'>(car.error);
    return { step: 'details', fieldErrors: { ...errors, ...(formData.get('brand') === 'other' && errors.brand ? { brandOther: errors.brand } : {}) } };
  }
  let publicTagId: string;
  try {
    const outcome = await claimTag(session.actor, text(formData, 'tagId'), car.data, { ipHash: hashIp(getClientIp(await headers())) });
    if (!outcome.ok) return { step: 'details', formError: outcome.reason };
    publicTagId = outcome.publicTagId;
  } catch (error) {
    console.error('[activate] adding a sticker failed:', error instanceof Error ? error.message : error);
    return { step: 'details', formError: 'server_error' };
  }
  redirect(activationDonePath(locale, publicTagId));
}
