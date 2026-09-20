'use server';

import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { toLocale } from '@/i18n/locales';
import { getSettings } from '@/lib/config/settings';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { usersRepository } from '@/lib/db/repositories/users';
import { hashSecret } from '@/lib/security/password';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { fieldErrors, loginSchema, registerSchema, type RegisterField } from '@/lib/validation/auth';
import { safeNext, type AuthFormState } from './state';

const HOUR_MS = 60 * 60 * 1000;

/** Counts the attempt against this connection and this email address. */
async function withinLoginLimit(email: string): Promise<boolean> {
  const settings = await getSettings();
  const ipHash = hashIp(getClientIp(await headers()));
  const emailHash = hashIp(email.trim().toLowerCase());
  const [byIp, byEmail] = await Promise.all([
    rateLimitsRepository.hit(`ownerlogin:ip:${ipHash}`, settings.rateLimitOwnerLoginPerHour, HOUR_MS),
    rateLimitsRepository.hit(`ownerlogin:email:${emailHash}`, settings.rateLimitOwnerLoginPerHour, HOUR_MS),
  ]);
  return byIp.allowed && byEmail.allowed;
}

/** Sign in. Every failure returns the same message: never say which part was wrong. */
export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = toLocale(formData.get('locale'));
  const parsed = loginSchema.safeParse({
    email: formData.get('email') ?? '',
    password: formData.get('password') ?? '',
  });
  if (!parsed.success) return { status: 'error', formError: 'invalid_credentials' };

  try {
    if (!(await withinLoginLimit(parsed.data.email))) {
      return { status: 'error', formError: 'rate_limited' };
    }
    await signIn('credentials', { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { status: 'error', formError: 'invalid_credentials' };
    console.error('[auth] sign-in failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }

  redirect(safeNext(formData.get('next'), locale));
}

/** Create an account, then sign the customer straight in. */
export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = toLocale(formData.get('locale'));
  const parsed = registerSchema.safeParse({
    name: formData.get('name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    password: formData.get('password') ?? '',
    locale,
  });
  if (!parsed.success) {
    return { status: 'error', fieldErrors: fieldErrors<RegisterField>(parsed.error) };
  }

  const { password, ...profile } = parsed.data;
  try {
    if (!(await withinLoginLimit(profile.email))) return { status: 'error', formError: 'rate_limited' };

    const created = await usersRepository.create({ ...profile, passwordHash: await hashSecret(password) });
    // An existing address is reported on the field, not as "this account exists"
    // in a way that helps enumeration: the copy invites signing in instead.
    if (!created.created) return { status: 'error', fieldErrors: { email: 'email_taken' } };

    await signIn('credentials', { email: profile.email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { status: 'error', formError: 'server_error' };
    console.error('[auth] registration failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }

  redirect(safeNext(formData.get('next'), locale));
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  await signOut({ redirect: false });
  redirect(`/${locale}`);
}
