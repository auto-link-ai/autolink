'use server';

import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { adminRenewalsRepository } from '@/lib/db/repositories/renewalsAdmin';
import { isValidRenewalRef } from '@/lib/renewals/ref';

/** Both actions decide what a customer has paid for: ADMIN role only, checked here. */
async function requireAdminFor(formData: FormData) {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const back = (result: string) => `/${locale}/admin/renewals?result=${result}`;
  if (session.actor.role !== 'ADMIN') redirect(back('forbidden'));
  const ref = formData.get('ref');
  if (!isValidRenewalRef(ref)) redirect(back('not_found'));
  return { session, ref, back };
}

/** The payment is in: the sticker's service is extended. */
export async function confirmRenewalAction(formData: FormData): Promise<void> {
  const { session, ref, back } = await requireAdminFor(formData);
  const result = await adminRenewalsRepository.confirm(session.actor, ref);
  redirect(back(result.ok ? 'confirmed' : result.reason));
}

/** No payment, or the owner changed their mind: the request closes, the sticker is untouched. */
export async function cancelRenewalAction(formData: FormData): Promise<void> {
  const { session, ref, back } = await requireAdminFor(formData);
  const result = await adminRenewalsRepository.cancel(session.actor, ref);
  redirect(back(result.ok ? 'cancelled' : result.reason));
}
