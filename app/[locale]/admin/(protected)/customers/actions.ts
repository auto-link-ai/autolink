'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { customerListReturnPath } from '@/lib/admin/customerListQuery';
import { usersRepository } from '@/lib/db/repositories/users';
import { USER_STATUSES } from '@/lib/domain/constants';
import { generateReadablePassword, hashSecret } from '@/lib/security/password';
import { customerContactSchema } from '@/lib/validation/auth';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import { RESET_PASSWORD_INITIAL, type ResetPasswordState } from './state';

const idSchema = z.string().refine(isValidPublicUserId, { message: 'invalid' });

/**
 * Support actions on one customer account. Reading the admin area needs a
 * session; changing an account needs the ADMIN role, checked here and not only
 * in the UI (rule 6). SUPPORT can look, not touch.
 */
async function requireAdminRole(locale: string) {
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  return session;
}

/** Block or unblock. A blocked account cannot sign in and its session dies on the next request. */
export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await requireAdminRole(locale);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(customerListReturnPath(locale, returnSearch, 'not_allowed'));

  const parsed = z
    .object({ publicUserId: idSchema, status: z.enum(USER_STATUSES) })
    .safeParse({ publicUserId: formData.get('publicUserId'), status: formData.get('status') });
  if (!parsed.success) redirect(customerListReturnPath(locale, returnSearch, 'invalid'));

  const result = await usersRepository.setStatus(session.actor, parsed.data.publicUserId, parsed.data.status);
  redirect(customerListReturnPath(locale, returnSearch, result.ok ? 'ok' : 'not_found'));
}

/** Fix a mistyped name or phone. The email is the account's identity and stays put. */
export async function updateCustomerContactAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await requireAdminRole(locale);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(customerListReturnPath(locale, returnSearch, 'not_allowed'));

  const publicUserId = formData.get('publicUserId');
  const contact = customerContactSchema.safeParse({
    name: formData.get('name') ?? '',
    phone: formData.get('phone') ?? '',
  });
  if (!isValidPublicUserId(publicUserId) || !contact.success) {
    redirect(customerListReturnPath(locale, returnSearch, 'invalid'));
  }

  const result = await usersRepository.updateContact(session.actor, publicUserId, contact.data);
  redirect(customerListReturnPath(locale, returnSearch, result.ok ? 'ok' : 'not_found'));
}

/**
 * Issues a new password for a locked-out customer and returns it once, through
 * the form's own state — never through a redirect parameter, so it stays out of
 * the URL, the browser history and the server log.
 */
export async function resetCustomerPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  if (session.actor.role !== 'ADMIN') return { status: 'error', error: 'not_allowed' };

  const publicUserId = formData.get('publicUserId');
  if (!isValidPublicUserId(publicUserId)) return { status: 'error', error: 'invalid' };

  try {
    const password = generateReadablePassword();
    const result = await usersRepository.setPasswordHashById(
      session.actor,
      publicUserId,
      await hashSecret(password),
    );
    if (!result.ok) return { status: 'error', error: 'not_found' };
    return { status: 'done', password };
  } catch (error) {
    console.error('[admin/customers] password reset failed:', error instanceof Error ? error.message : error);
    return { ...RESET_PASSWORD_INITIAL, status: 'error', error: 'server_error' };
  }
}
