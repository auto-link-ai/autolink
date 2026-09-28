'use client';

import { CheckIcon, PinIcon, TruckIcon } from '@/components/site/icons';
import { cx } from '@/lib/cx';
import { DELIVERY_TYPES, type DeliveryType } from '@/lib/domain/constants';
import { formatDzd } from '@/lib/format/currency';
import type { FeeRow } from '@/lib/orders/totals';
import type { OrderFormLabels } from '../orderLabels';

const ICONS = { HOME: TruckIcon, STOPDESK: PinIcon } as const;

/**
 * Home or the courier's office, each with its own fee once the wilaya is
 * known — the customer sees what delivery costs before choosing, not after.
 */
export function DeliveryChoice({
  labels,
  deliveryType,
  onDeliveryType,
  fee,
  currencyLabel,
}: {
  labels: OrderFormLabels;
  deliveryType: DeliveryType;
  onDeliveryType: (type: DeliveryType) => void;
  /** The chosen wilaya's fees, or null before one is chosen. */
  fee: FeeRow | null;
  currencyLabel: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-text">{labels.fields.deliveryType}</legend>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {DELIVERY_TYPES.map((type) => {
          const checked = deliveryType === type;
          const Icon = ICONS[type];
          const amount = fee ? (type === 'HOME' ? fee.home : fee.stopdesk) : null;
          return (
            <label
              key={type}
              className={cx(
                'flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent/30',
                checked ? 'border-accent bg-accent-soft' : 'border-border bg-white hover:border-border-strong',
              )}
            >
              <input
                id={`order-delivery-${type}`}
                type="radio"
                name="deliveryType"
                value={type}
                checked={checked}
                onChange={() => onDeliveryType(type)}
                className="sr-only"
              />
              <span
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  checked ? 'bg-accent text-white' : 'bg-surface-3 text-accent',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold text-text">{type === 'HOME' ? labels.fields.home : labels.fields.stopdesk}</span>
                {amount === null ? (
                  <span className="text-[13px] text-text-muted">{labels.feeAfterWilaya}</span>
                ) : (
                  <span dir={amount === 0 ? undefined : 'ltr'} className="self-start text-sm font-bold text-accent">
                    {amount === 0 ? labels.free : formatDzd(amount, currencyLabel)}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  checked ? 'border-accent bg-accent text-white' : 'border-border-strong bg-white',
                )}
              >
                {checked && <CheckIcon className="h-3 w-3" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
