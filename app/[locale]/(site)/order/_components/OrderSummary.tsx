'use client';

import { formatDzd } from '@/lib/format/currency';
import type { OrderTotals } from '@/lib/orders/totals';
import type { OrderFormLabels } from '../orderLabels';

/** What it costs, beside the form on a wide screen and below it on a phone. */
export function OrderSummary({
  labels,
  unitPrice,
  currencyLabel,
  quantity,
  totals,
}: {
  labels: OrderFormLabels;
  unitPrice: number;
  currencyLabel: string;
  quantity: number;
  totals: OrderTotals | null;
}) {
  return (
    <aside className="rounded-xl bg-surface-3 p-6 md:p-8">
      <h2 className="text-h3 text-text">{labels.summary.title}</h2>
      <dl className="mt-5 flex flex-col gap-3 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">{labels.summary.unitPrice}</dt>
          <dd dir="ltr" className="font-semibold text-text">
            {formatDzd(unitPrice, currencyLabel)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">{labels.summary.quantity}</dt>
          <dd className="font-semibold text-text">{quantity}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">{labels.summary.delivery}</dt>
          <dd dir="ltr" className="font-semibold text-text">
            {totals ? formatDzd(totals.deliveryFee, currencyLabel) : labels.summary.deliveryUnknown}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t border-border-strong pt-4">
          <dt className="font-bold text-text">{labels.summary.total}</dt>
          <dd dir="ltr" className="text-h3 text-accent">
            {totals ? formatDzd(totals.totalPrice, currencyLabel) : '—'}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-text-secondary">{labels.summary.cod}</p>
      <p className="mt-5 text-sm leading-relaxed text-text-muted">{labels.notice}</p>
    </aside>
  );
}
