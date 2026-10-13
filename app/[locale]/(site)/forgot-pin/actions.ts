'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { toLocale } from '@/i18n/locales';
import { finishPinReset, requestPinReset, resendPinReset, type ResetState } from '@/lib/auth/pinReset';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { fieldErrors, requiredPhoneSchema } from '@/lib/validation/auth';

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * « Code PIN oublié ? »: one form, three moves — ask for a code, send it
 * again, or give the code with the new PIN. Success signs the owner in.
 */
export async function pinResetAction(prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = toLocale(formData.get('locale'));
  const step = text(formData, 'step');
  let signedInPhone: string | null = null;
  const pin = text(formData, 'pin');

  try {
    const ipHash = hashIp(getClientIp(await headers()));
    if (step === 'resend') return await resendPinReset(text(formData, 'challengeId'), ipHash);
    if (step === 'code') {
      const done = await finishPinReset({
        challengeId: text(formData, 'challengeId'),
        code: text(formData, 'code'),
        pin,
        pinConfirm: text(formData, 'pinConfirm'),
      });
      if (!done.ok) return done.state;
      await signIn('credentials', { phone: done.phone, pin, redirect: false });
      signedInPhone = done.phone;
    } else {
      const phone = requiredPhoneSchema.safeParse(text(formData, 'phone'));
      if (!phone.success) return { step: 'phone', fieldErrors: { phone: fieldErrors<'phone'>(phone.error).phone ?? 'invalid_phone' } };
      return await requestPinReset(phone.data, ipHash);
    }
  } catch (error) {
    console.error('[pin-reset] failed:', error instanceof Error ? error.message : error);
    return { ...prev, formError: 'server_error' };
  }
  if (signedInPhone) redirect(`/${locale}/dashboard`);
  return prev;
}
