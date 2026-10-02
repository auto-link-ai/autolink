'use client';

import { CheckIcon } from '@/components/site/icons';
import { cx } from '@/lib/cx';
import { formatDzd } from '@/lib/format/currency';
import type { OrderFormLabels } from '../orderLabels';
import { allowsMore, clampQuantity, quantityCards } from '../orderFieldOrder';

const CARD =
  'relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-2 py-3.5 text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent/30';

function Tick() {
  return (
    <span className="absolute -top-2 -inset-e-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-card-sm">
      <CheckIcon className="h-3.5 w-3.5" />
    </span>
  );
}

/**
 * One sticker per car: 1, 2 or 3 cars as big cards with their price, and
 * « Plus » with − / + when settings allow more. Plain radios underneath, so
 * without JavaScript the choice still posts.
 */
export function QuantityCards({
  labels,
  maxQuantity,
  quantity,
  onQuantity,
  unitPrice,
  currencyLabel,
  error,
}: {
  labels: OrderFormLabels;
  maxQuantity: number;
  quantity: number;
  onQuantity: (value: number) => void;
  unitPrice: number;
  currencyLabel: string;
  error?: string;
}) {
  const cards = quantityCards(maxQuantity);
  const more = allowsMore(maxQuantity);
  const isMore = quantity > cards.length;
  const set = (value: number) => onQuantity(clampQuantity(value, maxQuantity));

  return (
    <div className="flex flex-col gap-3">
      <div className={cx('grid gap-2.5 sm:gap-3', more ? 'grid-cols-4' : 'grid-cols-3')}>
        {cards.map((count, index) => {
          const checked = quantity === count;
          return (
            <label
              key={count}
              className={cx(CARD, checked ? 'border-accent bg-accent-soft' : 'border-border bg-white hover:border-border-strong')}
            >
              <input
                id={`order-quantity-${count}`}
                type="radio"
                name="quantity"
                value={count}
                checked={checked}
                onChange={() => set(count)}
                className="sr-only"
              />
              {checked && <Tick />}
              <span className="text-[26px] leading-none font-extrabold text-text tabular-nums">{count}</span>
              <span className="text-[13px] font-semibold text-text-secondary">{labels.quantity.cars[index]}</span>
              <span dir="ltr" className="mt-1 text-[13px] font-bold text-accent sm:text-sm">
                {formatDzd(unitPrice * count, currencyLabel)}
              </span>
            </label>
          );
        })}
        {more && (
          <label
            className={cx(CARD, isMore ? 'border-accent bg-accent-soft' : 'border-border bg-white hover:border-border-strong')}
          >
            <input
              id="order-quantity-more"
              type="radio"
              name="quantity"
              value={isMore ? quantity : cards.length + 1}
              checked={isMore}
              onChange={() => set(cards.length + 1)}
              className="sr-only"
            />
            {isMore && <Tick />}
            <span dir="ltr" className="text-[26px] leading-none font-extrabold text-text tabular-nums">
              {cards.length + 1}+
            </span>
            <span className="text-[13px] font-semibold text-text-secondary">{labels.quantity.more}</span>
          </label>
        )}
      </div>

      {isMore && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={labels.quantity.fewer}
              onClick={() => set(quantity - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-white text-xl font-bold text-text hover:bg-surface-3"
            >
              −
            </button>
            <span aria-live="polite" className="min-w-16 text-center text-[16px] font-bold text-text tabular-nums">
              {quantity} {labels.quantity.stickers}
            </span>
            <button
              type="button"
              aria-label={labels.quantity.oneMore}
              onClick={() => set(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-white text-xl font-bold text-text hover:bg-surface-3 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <span dir="ltr" className="text-[15px] font-bold text-accent">
            {formatDzd(unitPrice * quantity, currencyLabel)}
          </span>
        </div>
      )}

      {error ? (
        <p id="order-quantity-error" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-text-muted">{labels.quantity.hint}</p>
      )}
    </div>
  );
}
