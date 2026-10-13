'use server';

import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { toLocale } from '@/i18n/locales';
import { getSettings } from '@/lib/config/settings';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { fieldErrors, pinLoginSchema, type PinLoginField } from '@/lib/validation/auth';
import { safeNext, type AuthFormState } from './state';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Counts the attempt against this connection. The per-number limit — the one
 * that stops PIN guessing — is counted inside `authorize` (auth.ts).
 */
async function withinConnectionLimit(): Promise<boolean> {
  const settings = await getSettings();
  const ipHash = hashIp(getClientIp(await headers()));
  const hit = await rateLimitsRepository.hit(`ownerlogin:ip:${ipHash}`, settings.rateLimitOwnerLoginPerHour, HOUR_MS);
  return hit.allowed;
}

/**
 * Sign in with the WhatsApp number and the PIN. A wrong number and a wrong PIN
 * get the same message — never say which part was wrong.
 */
export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = toLocale(formData.get('locale'));
  const parsed = pinLoginSchema.safeParse({ phone: formData.get('phone') ?? '', pin: formData.get('pin') ?? '' });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors<PinLoginField>(parsed.error) };

  try {
    if (!(await withinConnectionLimit())) return { status: 'error', formError: 'rate_limited' };
    await signIn('credentials', { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const throttled = (error as { code?: string }).code === 'throttled';
      return { status: 'error', formError: throttled ? 'throttled' : 'invalid_credentials' };
    }
    console.error('[auth] sign-in failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }
  redirect(safeNext(formData.get('next'), locale));
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  await signOut({ redirect: false });
  redirect(`/${locale}`);
}
