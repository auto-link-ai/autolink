'use server';

import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { toLocale } from '@/i18n/locales';
import { sendNewOrderAlert } from '@/lib/orders/alert';
import { placeOrder } from '@/lib/orders/placeOrder';
import { ORDER_VIEW_COOKIE, ORDER_VIEW_TTL_SECONDS, orderViewToken } from '@/lib/orders/viewToken';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import type { OrderFormState } from './formState';

/**
 * Guest checkout. Everything price-related is recomputed on the server; the
 * form's totals are display only. On success the browser gets an httpOnly
 * cookie proving it placed the order, then lands on the confirmation page.
 */
export async function placeOrderAction(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const locale = toLocale(formData.get('locale'));
  let result;
  try {
    const ipHash = hashIp(getClientIp(await headers()));
    result = await placeOrder(Object.fromEntries(formData), { ipHash });
  } catch (error) {
    console.error('[order] failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }

  if (!result.ok) {
    return result.kind === 'invalid'
      ? { status: 'error', fieldErrors: result.fieldErrors }
      : { status: 'error', formError: result.kind };
  }

  const { orderRef, alert } = result;
  // The alert must never delay or fail the order.
  after(() => sendNewOrderAlert(alert));

  const store = await cookies();
  store.set(ORDER_VIEW_COOKIE, `${orderRef}.${orderViewToken(orderRef)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ORDER_VIEW_TTL_SECONDS,
  });

  redirect(`/${locale}/order/${orderRef}`);
}
