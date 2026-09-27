'use server';

import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { orderListReturnPath } from '@/lib/admin/orderListQuery';
import { getSettings } from '@/lib/config/settings';
import { adminOrderEditsRepository } from '@/lib/db/repositories/ordersAdminEdit';
import { isValidOrderRef } from '@/lib/orders/ref';
import { orderFieldErrors, orderInputSchema } from '@/lib/validation/order';
import { ORDER_FORM_FIELDS, type OrderFormState } from './orderFormState';

/** The list without the order that was just deleted open. */
function withoutRef(returnSearch: FormDataEntryValue | null): string {
  const params = new URLSearchParams(typeof returnSearch === 'string' ? returnSearch : '');
  params.delete('ref');
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * Saves the admin order form: an edit when it carries an order reference, a new
 * order taken by phone when it does not. The same checks as the website form;
 * the session is re-checked here, whatever the page showed.
 */
export async function saveOrderAction(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const settings = await getSettings();
  const raw = Object.fromEntries(ORDER_FORM_FIELDS.map((field) => [field, formData.get(field) ?? '']));
  const parsed = orderInputSchema(settings.maxOrderQuantity).safeParse(raw);
  if (!parsed.success) return { status: 'error', fieldErrors: orderFieldErrors(parsed.error) };

  const orderRef = formData.get('orderRef');
  if (typeof orderRef === 'string' && orderRef !== '') {
    if (!isValidOrderRef(orderRef)) return { status: 'error', formError: 'not_found' };
    const result = await adminOrderEditsRepository.update(session.actor, orderRef, parsed.data, settings.deliveryFees);
    if (!result.ok) return { status: 'error', formError: result.reason };
    redirect(orderListReturnPath(locale, formData.get('returnSearch'), 'ok'));
  }

  const created = await adminOrderEditsRepository.createManual(session.actor, parsed.data, {
    unitPrice: settings.unitPriceDzd,
    deliveryFees: settings.deliveryFees,
  });
  if (!created.ok) return { status: 'error', formError: created.reason };
  redirect(`/${locale}/admin/orders?ref=${created.orderRef}&result=created`);
}

/** Deletes a new or cancelled order. Deleting needs the ADMIN role, checked here. */
export async function deleteOrderAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(orderListReturnPath(locale, returnSearch, 'forbidden'));

  const orderRef = formData.get('orderRef');
  if (!isValidOrderRef(orderRef)) redirect(orderListReturnPath(locale, returnSearch, 'invalid'));
  const result = await adminOrderEditsRepository.remove(session.actor, orderRef);
  redirect(orderListReturnPath(locale, result.ok ? withoutRef(returnSearch) : returnSearch, result.ok ? 'deleted' : result.reason));
}
