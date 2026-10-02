'use client';

import { CashIcon } from '@/components/site/icons';
import { formatDzd } from '@/lib/format/currency';
import type { OrderTotals } from '@/lib/orders/totals';
import type { OrderFormLabels } from '../orderLabels';

/**
 * What it costs, right above the button: stickers, delivery, total, and that
 * nothing is paid now. Display only — the server computes the stored price.
 */
export function OrderTotal({
  labels,
  unitPrice,
  currencyLabel,
  quantity,
  totals,
  note = true,
}: {
  labels: OrderFormLabels;
  unitPrice: number;
  currencyLabel: string;
  quantity: number;
  totals: OrderTotals | null;
  /** « Rien à payer maintenant… »; the ad page's short form goes without. */
  note?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface-3 p-4 sm:p-5">
      <dl className="flex flex-col gap-2 text-[15px]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-text-secondary">
            {labels.total.stickers}{' '}
            <span dir="ltr" className="whitespace-nowrap text-text-muted">
              ({quantity} × {formatDzd(unitPrice, currencyLabel)})
            </span>
          </dt>
          <dd dir="ltr" className="font-semibold whitespace-nowrap text-text">
            {formatDzd(unitPrice * quantity, currencyLabel)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-text-secondary">{labels.total.delivery}</dt>
          <dd dir={totals?.deliveryFee ? 'ltr' : undefined} className={totals?.deliveryFee === 0 ? 'font-bold text-success' : 'font-semibold text-text'}>
            {!totals
              ? labels.total.deliveryPending
              : totals.deliveryFee === 0
                ? labels.free
                : formatDzd(totals.deliveryFee, currencyLabel)}
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border-strong pt-3">
          <dt className="font-bold text-text">{labels.total.total}</dt>
          <dd dir="ltr" data-order-total className="text-h3 whitespace-nowrap text-accent">
            {totals ? formatDzd(totals.totalPrice, currencyLabel) : '—'}
          </dd>
        </div>
      </dl>
      {note && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <CashIcon className="h-4.5 w-4.5 shrink-0" />
          {labels.total.nothingNow}
        </p>
      )}
    </div>
  );
}
