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
