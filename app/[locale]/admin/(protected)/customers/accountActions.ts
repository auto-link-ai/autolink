'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { defaultLocale, toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { customerListReturnPath } from '@/lib/admin/customerListQuery';
import { adminCustomersRepository } from '@/lib/db/repositories/customersAdmin';
import { generateReadablePassword, hashSecret } from '@/lib/security/password';
import { emailSchema, nameSchema, optionalPhoneSchema } from '@/lib/validation/auth';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { NewCustomerState } from './accountState';

const newCustomerSchema = z.object({ email: emailSchema, name: nameSchema, phone: optionalPhoneSchema });

/**
 * An account made by hand (a customer who asked by phone). Its temporary
 * password comes back once, through the form's own state — never in a URL.
 * Changing accounts needs the ADMIN role, checked here.
 */
export async function createCustomerAction(_prev: NewCustomerState, formData: FormData): Promise<NewCustomerState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  if (session.actor.role !== 'ADMIN') return { status: 'error', formError: 'not_allowed' };

  const parsed = newCustomerSchema.safeParse({
    email: formData.get('email') ?? '',
    name: formData.get('name') ?? '',
    phone: formData.get('phone') ?? '',
  });
  if (!parsed.success) {
    const fieldErrors: NewCustomerState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as 'email' | 'name' | 'phone';
      fieldErrors[field] ??= issue.message;
    }
    return { status: 'error', fieldErrors };
  }

  try {
    const password = generateReadablePassword();
    const result = await adminCustomersRepository.create(session.actor, {
      ...parsed.data,
      passwordHash: await hashSecret(password),
      locale: defaultLocale,
    });
    if (!result.ok) return { status: 'error', formError: 'email_taken' };
    return { status: 'done', password, publicUserId: result.publicUserId };
  } catch (error) {
    console.error('[admin/customers] create failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }
}

/** Deletes an account and what it owns (see the repository). ADMIN role, checked here. */
export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(customerListReturnPath(locale, returnSearch, 'not_allowed'));

  const publicUserId = formData.get('publicUserId');
  if (!isValidPublicUserId(publicUserId)) redirect(customerListReturnPath(locale, returnSearch, 'invalid'));
  const result = await adminCustomersRepository.remove(session.actor, publicUserId);
  if (!result.ok) redirect(customerListReturnPath(locale, returnSearch, 'not_found'));

  const params = new URLSearchParams(typeof returnSearch === 'string' ? returnSearch : '');
  params.delete('id');
  redirect(customerListReturnPath(locale, params.size ? `?${params}` : '', 'deleted'));
}
