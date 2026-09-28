import type { DeliveryType } from '@/lib/domain/constants';

export interface FeeRow {
  wilayaCode: number;
  home: number;
  stopdesk: number;
}

export interface OrderTotals {
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
}

/**
 * The one price calculation, shared by the order form (display only) and the
 * server (the value that is stored). Returns null when the wilaya has no
 * delivery fee configured — such orders are refused, never priced at 0.
 */
export function computeOrderTotals(
  input: { quantity: number; wilayaCode: number; deliveryType: DeliveryType },
  pricing: { unitPrice: number; deliveryFees: readonly FeeRow[] },
): OrderTotals | null {
  const fee = pricing.deliveryFees.find((row) => row.wilayaCode === input.wilayaCode);
  if (!fee) return null;
  const deliveryFee = input.deliveryType === 'HOME' ? fee.home : fee.stopdesk;
  return {
    unitPrice: pricing.unitPrice,
    deliveryFee,
    totalPrice: pricing.unitPrice * input.quantity + deliveryFee,
  };
}

/**
 * True when every wilaya delivers for free: the page can then say so before a
 * wilaya is even chosen. False while no fee is configured at all.
 */
export function deliveryFreeEverywhere(deliveryFees: readonly FeeRow[]): boolean {
  return deliveryFees.length > 0 && deliveryFees.every((row) => row.home === 0 && row.stopdesk === 0);
}

/**
 * What the order form shows: the chosen wilaya's totals, or — before one is
 * chosen — the stickers alone when delivery is free everywhere. Display only.
 */
export function shownOrderTotals(
  input: { quantity: number; wilayaCode: number | ''; deliveryType: DeliveryType },
  pricing: { unitPrice: number; deliveryFees: readonly FeeRow[] },
): OrderTotals | null {
  if (input.wilayaCode !== '') return computeOrderTotals({ ...input, wilayaCode: input.wilayaCode }, pricing);
  if (!deliveryFreeEverywhere(pricing.deliveryFees)) return null;
  return { unitPrice: pricing.unitPrice, deliveryFee: 0, totalPrice: pricing.unitPrice * input.quantity };
}
