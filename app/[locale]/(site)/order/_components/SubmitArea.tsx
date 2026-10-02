'use client';

import { PhoneIcon, WhatsAppIcon } from '@/components/site/icons';
import { Button } from '@/components/ui/Button';
import type { OrderTotals } from '@/lib/orders/totals';
import type { OrderFormLabels } from '../orderLabels';
import { OrderTotal } from './OrderTotal';

/**
 * The end of the order form: the total, what went wrong if anything, the one
 * button, then the reassurance lines. The ad page's short form keeps only the
 * total and the button.
 */
export function SubmitArea({
  labels,
  unitPrice,
  currencyLabel,
  quantity,
  totals,
  formError,
  needsFixing,
  pending,
  whatsapp,
  short,
}: {
  labels: OrderFormLabels;
  unitPrice: number;
  currencyLabel: string;
  quantity: number;
  totals: OrderTotals | null;
  formError: string | undefined;
  needsFixing: boolean;
  pending: boolean;
  whatsapp: { href: string; label: string } | null;
  short: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <OrderTotal
        labels={labels}
        unitPrice={unitPrice}
        currencyLabel={currencyLabel}
        quantity={quantity}
        totals={totals}
        note={!short}
      />

      {formError && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {labels.errors[formError] ?? labels.errors.server_error}
        </p>
      )}
      {needsFixing && !pending && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {labels.checkFields}
        </p>
      )}

      <Button type="submit" disabled={pending} data-order-submit className="h-15 w-full text-[17px]">
        {pending ? labels.actions.ordering : labels.actions.order}
      </Button>

      {!short && (
        <>
          <p className="flex items-center justify-center gap-2 text-center text-sm text-text-secondary">
            <PhoneIcon className="h-4 w-4 shrink-0 text-accent" />
            {labels.reassurance}
          </p>
          {whatsapp && (
            <a
              href={whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-strong px-5 text-[15px] font-bold text-text hover:bg-surface-2"
            >
              <WhatsAppIcon className="h-5 w-5 text-success" />
              {whatsapp.label}
            </a>
          )}
          <p className="text-center text-xs leading-relaxed text-text-muted">{labels.notice}</p>
        </>
      )}
    </div>
  );
}
