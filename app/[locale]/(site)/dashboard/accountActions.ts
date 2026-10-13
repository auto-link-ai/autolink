'use server';

import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { toLocale } from '@/i18n/locales';
import { replacePin } from '@/lib/auth/pinChange';
import { spendPinAttempt } from '@/lib/auth/pinLimits';
import { getOwnerSession } from '@/lib/auth/session';
import { usersRepository } from '@/lib/db/repositories/users';
import { verifyPin } from '@/lib/security/pin';
import { newPinProblem, normalizePin, pinSchema } from '@/lib/validation/pin';
import type { ChangePinState } from './pinState';

/**
 * The owner choosing a new PIN. The current one is checked first, and counted
 * like a sign-in try, so this form cannot be used to guess the PIN on an
 * unattended, signed-in phone. Every other device is then signed out; this one
 * signs in again with the new PIN, and the dashboard says it is done (a
 * redirect: signing in refreshes the page, which a form state would not survive).
 */
export async function changePinAction(_prev: ChangePinState, formData: FormData): Promise<ChangePinState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const current = pinSchema.safeParse(String(formData.get('current') ?? ''));
  if (!current.success) return { status: 'error', fieldErrors: { current: 'pin_format' } };
  const pin = String(formData.get('pin') ?? '');
  const problem = newPinProblem(pin, String(formData.get('pinConfirm') ?? ''), session.phone);
  if (problem) return { status: 'error', fieldErrors: problem === 'pin_mismatch' ? { pinConfirm: problem } : { pin: problem } };
  if (normalizePin(pin) === current.data) return { status: 'error', fieldErrors: { pin: 'same_pin' } };

  try {
    if (!(await spendPinAttempt(session.phone))) return { status: 'error', formError: 'throttled' };
    const stored = await usersRepository.pinHashFor(session.actor);
    if (!stored || !(await verifyPin(stored, current.data))) {
      return { status: 'error', fieldErrors: { current: 'wrong_current' } };
    }
    if (!(await replacePin(session.actor.userId, session.phone, normalizePin(pin)))) {
      return { status: 'error', formError: 'server_error' };
    }
    await signIn('credentials', { phone: session.phone, pin: normalizePin(pin), redirect: false });
  } catch (error) {
    console.error('[dashboard] PIN change failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }
  redirect(`/${locale}/dashboard?result=pin_changed`);
}
