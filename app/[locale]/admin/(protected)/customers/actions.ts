'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { customerListReturnPath } from '@/lib/admin/customerListQuery';
import { issueTemporaryPin, unlockPin } from '@/lib/admin/customerPins';
import { adminCustomersRepository } from '@/lib/db/repositories/customersAdmin';
import { USER_STATUSES } from '@/lib/domain/constants';
import { customerContactSchema, fieldErrors } from '@/lib/validation/auth';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { ContactField, ContactState, TemporaryPinState } from './state';

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

  const result = await adminCustomersRepository.setStatus(session.actor, parsed.data.publicUserId, parsed.data.status);
  redirect(customerListReturnPath(locale, returnSearch, result.ok ? 'ok' : 'not_found'));
}

/**
 * Fix a mistyped name, or move the customer to a new number once support has
 * checked it is them. The number is their sign-in, so it must stay unique.
 * Errors come back under their field; a save goes back to the list.
 */
export async function updateCustomerContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const locale = toLocale(formData.get('locale'));
  const session = await requireAdminRole(locale);
  if (session.actor.role !== 'ADMIN') return { status: 'error', formError: 'not_allowed' };

  const publicUserId = formData.get('publicUserId');
  if (!isValidPublicUserId(publicUserId)) return { status: 'error', formError: 'not_found' };
  const parsed = customerContactSchema.safeParse({
    firstName: formData.get('firstName') ?? '',
    lastName: formData.get('lastName') ?? '',
    phone: formData.get('phone') ?? '',
  });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors<ContactField>(parsed.error) };

  const result = await adminCustomersRepository.updateContact(session.actor, publicUserId, parsed.data);
  if (!result.ok) {
    return result.reason === 'phone_taken'
      ? { status: 'error', fieldErrors: { phone: 'phone_taken' } }
      : { status: 'error', formError: 'not_found' };
  }
  redirect(customerListReturnPath(locale, formData.get('returnSearch'), 'ok'));
}

/**
 * A temporary PIN for a customer who cannot get in (lib/admin/customerPins.ts).
 * It comes back once, through the form's own state — never through a redirect
 * parameter, so it stays out of the URL, the browser history and the server log.
 */
export async function issueTemporaryPinAction(
  _prev: TemporaryPinState,
  formData: FormData,
): Promise<TemporaryPinState> {
  const locale = toLocale(formData.get('locale'));
  const session = await requireAdminRole(locale);
  if (session.actor.role !== 'ADMIN') return { status: 'error', error: 'not_allowed' };

  const publicUserId = formData.get('publicUserId');
  if (!isValidPublicUserId(publicUserId)) return { status: 'error', error: 'not_found' };

  try {
    const pin = await issueTemporaryPin(session.actor, publicUserId);
    return pin ? { status: 'done', pin } : { status: 'error', error: 'not_found' };
  } catch (error) {
    console.error('[admin/customers] temporary PIN failed:', error instanceof Error ? error.message : error);
    return { status: 'error', error: 'server_error' };
  }
}

/** The customer tried their PIN too often: their tries are forgotten, they may try again now. */
export async function unlockCustomerPinAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await requireAdminRole(locale);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(customerListReturnPath(locale, returnSearch, 'not_allowed'));

  const publicUserId = formData.get('publicUserId');
  if (!isValidPublicUserId(publicUserId)) redirect(customerListReturnPath(locale, returnSearch, 'invalid'));
  const unlocked = await unlockPin(session.actor, publicUserId);
  redirect(customerListReturnPath(locale, returnSearch, unlocked ? 'unlocked' : 'not_found'));
}
