import 'server-only';
import { getSettings } from '@/lib/config/settings';
import { getWilayas } from '@/lib/config/wilayas';
import { ordersRepository } from '@/lib/db/repositories/orders';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { orderFieldErrors, orderInputSchema, type OrderField } from '@/lib/validation/order';
import { generateOrderRef } from './ref';
import { computeOrderTotals } from './totals';

const HOUR_MS = 60 * 60 * 1000;

export type PlaceOrderResult =
  | {
      ok: true;
      orderRef: string;
      alert: { orderRef: string; quantity: number; wilayaName: string; totalPrice: number; currencyLabel: string };
    }
  | { ok: false; kind: 'invalid'; fieldErrors: Partial<Record<OrderField, string>> }
  | { ok: false; kind: 'no_delivery' | 'rate_limited' | 'rejected' };

/**
 * Guest checkout. Price and delivery fee come from settings at this moment and
 * are snapshotted onto the order; nothing price-related is read from the form.
 */
export async function placeOrder(
  raw: Record<string, FormDataEntryValue | null>,
  context: { ipHash: string },
): Promise<PlaceOrderResult> {
  // Honeypot: real people never see or fill this field.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') return { ok: false, kind: 'rejected' };

  const settings = await getSettings();
  const parsed = orderInputSchema(settings.maxOrderQuantity).safeParse({
    quantity: raw.quantity,
    customerName: raw.customerName ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    wilayaCode: raw.wilayaCode,
    commune: raw.commune ?? '',
    address: raw.address ?? '',
    deliveryType: raw.deliveryType,
    deliveryNotes: raw.deliveryNotes ?? '',
  });
  if (!parsed.success) return { ok: false, kind: 'invalid', fieldErrors: orderFieldErrors(parsed.error) };
  const input = parsed.data;

  const wilaya = (await getWilayas()).find((w) => w.code === input.wilayaCode);
  const totals = computeOrderTotals(input, { unitPrice: settings.unitPriceDzd, deliveryFees: settings.deliveryFees });
  if (!wilaya || !totals) return { ok: false, kind: 'no_delivery' };

  const hit = await rateLimitsRepository.hit(`order:ip:${context.ipHash}`, settings.rateLimitOrdersPerHour, HOUR_MS);
  if (!hit.allowed) return { ok: false, kind: 'rate_limited' };

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderRef = generateOrderRef();
    const { created } = await ordersRepository.create(orderRef, { ...input, ...totals });
    if (created) {
      return {
        ok: true,
        orderRef,
        // The admin alert is in French, whatever language the customer used.
        alert: {
          orderRef,
          quantity: input.quantity,
          wilayaName: wilaya.nameFr,
          totalPrice: totals.totalPrice,
          currencyLabel: settings.currencyLabel,
        },
      };
    }
  }
  throw new Error('Could not allocate a unique order reference.');
}
