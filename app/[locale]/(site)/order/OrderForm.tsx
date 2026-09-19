'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/site/icons';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { formatDzd } from '@/lib/format/currency';
import { computeOrderTotals, type FeeRow } from '@/lib/orders/totals';
import type { DeliveryType } from '@/lib/domain/constants';
import type { OrderField } from '@/lib/validation/order';
import { placeOrderAction } from './actions';
import { ORDER_FORM_INITIAL, type OrderFormState } from './formState';

export interface OrderFormLabels {
  fields: Record<
    'quantity' | 'name' | 'phone' | 'phoneHint' | 'email' | 'emailHint' | 'wilaya' | 'wilayaPlaceholder' | 'commune' | 'address' | 'deliveryType' | 'home' | 'stopdesk' | 'notes' | 'notesHint',
    string
  >;
  summary: Record<'title' | 'unitPrice' | 'quantity' | 'delivery' | 'deliveryUnknown' | 'total' | 'cod', string>;
  actions: Record<'review' | 'edit' | 'confirm' | 'confirming', string>;
  errors: Record<string, string>;
  notice: string;
}

interface Props {
  locale: Locale;
  labels: OrderFormLabels;
  wilayas: { code: number; name: string }[];
  fees: FeeRow[];
  unitPrice: number;
  currencyLabel: string;
  maxQuantity: number;
}

/**
 * Label, control, then hint or error. The label points at the control by id
 * rather than wrapping it: a wrapping label would swallow every <option> of a
 * select into its own text, leaving the field without a usable name.
 */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-sm font-medium text-danger">{error}</span>
      ) : (
        hint && <span className="text-sm text-text-muted">{hint}</span>
      )}
    </div>
  );
}

const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent';

export function OrderForm({ locale, labels, wilayas, fees, unitPrice, currencyLabel, maxQuantity }: Props) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(placeOrderAction, ORDER_FORM_INITIAL);
  const [review, setReview] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [wilayaCode, setWilayaCode] = useState<number | ''>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('HOME');

  const totals =
    wilayaCode === ''
      ? null
      : computeOrderTotals({ quantity, wilayaCode, deliveryType }, { unitPrice, deliveryFees: fees });

  const fieldError = (field: OrderField) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };
  // A server error always sends the customer back to the editable step.
  const showDetails = !review || state.status === 'error';

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people, tempting for bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className={cx('rounded-xl bg-white p-6 shadow-card-sm md:p-8', !showDetails && 'hidden')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="order-quantity" label={labels.fields.quantity} error={fieldError('quantity')}>
            <select
              id="order-quantity"
              name="quantity"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={INPUT}
            >
              {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field id="order-name" label={labels.fields.name} error={fieldError('customerName')}>
            <input id="order-name" name="customerName" required maxLength={80} autoComplete="name" className={INPUT} />
          </Field>

          <Field id="order-phone" label={labels.fields.phone} hint={labels.fields.phoneHint} error={fieldError('phone')}>
            <input id="order-phone" name="phone" required inputMode="tel" dir="ltr" autoComplete="tel" className={INPUT} />
          </Field>

          <Field id="order-email" label={labels.fields.email} hint={labels.fields.emailHint} error={fieldError('email')}>
            <input id="order-email" name="email" type="email" dir="ltr" autoComplete="email" className={INPUT} />
          </Field>

          <Field id="order-wilaya" label={labels.fields.wilaya} error={fieldError('wilayaCode')}>
            <select
              id="order-wilaya"
              name="wilayaCode"
              required
              value={wilayaCode}
              onChange={(event) => setWilayaCode(Number(event.target.value))}
              className={INPUT}
            >
              <option value="" disabled>
                {labels.fields.wilayaPlaceholder}
              </option>
              {wilayas.map((wilaya) => (
                <option key={wilaya.code} value={wilaya.code}>
                  {String(wilaya.code).padStart(2, '0')} — {wilaya.name}
                </option>
              ))}
            </select>
          </Field>

          <Field id="order-commune" label={labels.fields.commune} error={fieldError('commune')}>
            <input id="order-commune" name="commune" required maxLength={80} className={INPUT} />
          </Field>

          <div className="sm:col-span-2">
            <Field id="order-address" label={labels.fields.address} error={fieldError('address')}>
              <input id="order-address" name="address" required maxLength={200} autoComplete="street-address" className={INPUT} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <span className="text-sm font-bold text-text">{labels.fields.deliveryType}</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(['HOME', 'STOPDESK'] as const).map((type) => (
                <label
                  key={type}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-[15px] font-semibold',
                    deliveryType === type ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text',
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value={type}
                    checked={deliveryType === type}
                    onChange={() => setDeliveryType(type)}
                    className="sr-only"
                  />
                  <span
                    className={cx(
                      'flex h-5 w-5 items-center justify-center rounded-full border',
                      deliveryType === type ? 'border-accent bg-accent text-white' : 'border-border-strong',
                    )}
                  >
                    {deliveryType === type && <CheckIcon className="h-3 w-3" />}
                  </span>
                  {type === 'HOME' ? labels.fields.home : labels.fields.stopdesk}
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Field id="order-notes" label={labels.fields.notes} hint={labels.fields.notesHint} error={fieldError('deliveryNotes')}>
              <textarea id="order-notes" name="deliveryNotes" maxLength={300} rows={3} className={cx(INPUT, 'h-auto py-3')} />
            </Field>
          </div>
        </div>

        {state.formError && (
          <p role="alert" className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {labels.errors[state.formError] ?? labels.errors.server_error}
          </p>
        )}

        <Button type="button" onClick={() => setReview(true)} className="mt-6 w-full sm:w-auto">
          {labels.actions.review}
        </Button>
      </div>

      {/* Summary — also the confirm step */}
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

        {!showDetails && (
          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? labels.actions.confirming : labels.actions.confirm}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setReview(false)}>
              {labels.actions.edit}
            </Button>
          </div>
        )}
        <p className="mt-5 text-sm leading-relaxed text-text-muted">{labels.notice}</p>
      </aside>
    </form>
  );
}
