'use server';

import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { customerListReturnPath } from '@/lib/admin/customerListQuery';
import { adminCustomersRepository } from '@/lib/db/repositories/customersAdmin';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';

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
