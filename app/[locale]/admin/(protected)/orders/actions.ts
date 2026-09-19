'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { orderListReturnPath } from '@/lib/admin/orderListQuery';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { ORDER_ACTIONS, ORDER_FIELD_LIMITS } from '@/lib/domain/constants';
import { isValidOrderRef } from '@/lib/orders/ref';
import { normalizeTagIdInput } from '@/lib/validation/tagId';

const refSchema = z.string().refine(isValidOrderRef, { message: 'invalid' });

const statusInput = z.object({ orderRef: refSchema, action: z.enum(ORDER_ACTIONS) });

/** Confirm / prepare / ship / deliver / cancel. Re-checks the admin session itself. */
export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const returnSearch = formData.get('returnSearch');
  const parsed = statusInput.safeParse({
    orderRef: formData.get('orderRef'),
    action: formData.get('action'),
  });
  if (!parsed.success) redirect(orderListReturnPath(locale, returnSearch, 'invalid'));

  const result = await adminOrdersRepository.transition(session.actor, parsed.data.orderRef, parsed.data.action);
  redirect(orderListReturnPath(locale, returnSearch, result.ok ? 'ok' : result.reason));
}

/** Links the printed tags to the order at packing time. */
export async function assignOrderTagsAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const returnSearch = formData.get('returnSearch');
  const orderRef = formData.get('orderRef');
  const raw = formData.get('tagIds');
  if (!isValidOrderRef(orderRef) || typeof raw !== 'string') {
    redirect(orderListReturnPath(locale, returnSearch, 'invalid'));
  }

  const tagIds = raw
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(normalizeTagIdInput);
  if (tagIds.length === 0 || tagIds.some((id) => id === null)) {
    redirect(orderListReturnPath(locale, returnSearch, 'invalid'));
  }

  const result = await adminOrdersRepository.assignTags(session.actor, orderRef, tagIds as string[]);
  redirect(orderListReturnPath(locale, returnSearch, result.ok ? 'ok' : result.reason === 'unavailable' ? 'unavailable' : result.reason));
}

const shippingInput = z.object({
  orderRef: refSchema,
  courier: z.string().trim().max(ORDER_FIELD_LIMITS.courier.max).transform((v) => v || null),
  trackingNumber: z.string().trim().max(ORDER_FIELD_LIMITS.trackingNumber.max).transform((v) => v || null),
});

export async function updateOrderShippingAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const returnSearch = formData.get('returnSearch');
  const parsed = shippingInput.safeParse({
    orderRef: formData.get('orderRef'),
    courier: formData.get('courier') ?? '',
    trackingNumber: formData.get('trackingNumber') ?? '',
  });
  if (!parsed.success) redirect(orderListReturnPath(locale, returnSearch, 'invalid'));

  const { orderRef, ...shipping } = parsed.data;
  const result = await adminOrdersRepository.updateShipping(session.actor, orderRef, shipping);
  redirect(orderListReturnPath(locale, returnSearch, result.ok ? 'ok' : 'not_found'));
}
