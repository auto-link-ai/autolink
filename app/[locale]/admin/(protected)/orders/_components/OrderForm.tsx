'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { OrderField } from '@/lib/validation/order';
import { saveOrderAction } from '../editActions';
import { ORDER_FORM_INITIAL, type OrderFormState } from '../orderFormState';

const INPUT =
  'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent aria-[invalid=true]:border-danger';

export interface OrderFormLabels {
  fields: Record<OrderField, string>;
  home: string;
  stopdesk: string;
  wilayaPlaceholder: string;
  submit: string;
  working: string;
  cancel: string;
  /** Field error codes (from lib/validation/order.ts) → words. */
  errors: Record<string, string>;
  /** Refusals for the whole form. */
  formErrors: Record<NonNullable<OrderFormState['formError']>, string>;
}

export type OrderFormValues = Partial<Record<OrderField, string>>;

/**
 * The admin's order form: correcting an order (`orderRef` given) or taking one
 * by phone. The same checks as the website; each error sits under its field,
 * and what was typed stays.
 */
export function OrderForm({
  locale,
  orderRef,
  returnSearch,
  values,
  wilayas,
  labels,
  cancelHref,
}: {
  locale: Locale;
  orderRef?: string;
  returnSearch: string;
  values: OrderFormValues;
  wilayas: { code: number; name: string }[];
  labels: OrderFormLabels;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(saveOrderAction, ORDER_FORM_INITIAL);
  const idPrefix = orderRef ? `order-${orderRef}` : 'order-new';
  const errorOf = (field: OrderField) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  const field = (name: OrderField, control: (props: { id: string; invalid: boolean; describedBy?: string }) => React.ReactNode, wide = false) => {
    const id = `${idPrefix}-${name}`;
    const error = errorOf(name);
    return (
      <div className={cx('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
        <label htmlFor={id} className="text-sm font-semibold text-text">
          {labels.fields[name]}
        </label>
        {control({ id, invalid: Boolean(error), describedBy: error ? `${id}-error` : undefined })}
        {error && (
          <p id={`${id}-error`} className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    );
  };

  const text = (name: OrderField, extra: { dir?: 'ltr'; type?: string; maxLength?: number } = {}) =>
    field(name, ({ id, invalid, describedBy }) => (
      <input
        id={id}
        name={name}
        type={extra.type ?? 'text'}
        dir={extra.dir}
        maxLength={extra.maxLength}
        defaultValue={values[name] ?? ''}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cx(INPUT, extra.dir && 'rtl:text-end')}
      />
    ));

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderRef" value={orderRef ?? ''} />
      <input type="hidden" name="returnSearch" value={returnSearch} />

      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {labels.formErrors[state.formError]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {text('customerName', { maxLength: 80 })}
        {text('phone', { dir: 'ltr', type: 'tel', maxLength: 20 })}
        {text('email', { dir: 'ltr', type: 'email', maxLength: 120 })}
        {field('wilayaCode', ({ id, invalid, describedBy }) => (
          <select
            id={id}
            name="wilayaCode"
            defaultValue={values.wilayaCode ?? ''}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={INPUT}
          >
            <option value="">{labels.wilayaPlaceholder}</option>
            {wilayas.map((w) => (
              <option key={w.code} value={w.code}>
                {String(w.code).padStart(2, '0')} · {w.name}
              </option>
            ))}
          </select>
        ))}
        {text('commune', { maxLength: 80 })}
        {text('address', { maxLength: 200 })}
        {field('deliveryType', ({ id, invalid, describedBy }) => (
          <select
            id={id}
            name="deliveryType"
            defaultValue={values.deliveryType ?? 'HOME'}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={INPUT}
          >
            <option value="HOME">{labels.home}</option>
            <option value="STOPDESK">{labels.stopdesk}</option>
          </select>
        ))}
        {text('quantity', { type: 'number', dir: 'ltr' })}
        {field(
          'deliveryNotes',
          ({ id, invalid, describedBy }) => (
            <textarea
              id={id}
              name="deliveryNotes"
              rows={2}
              maxLength={300}
              defaultValue={values.deliveryNotes ?? ''}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={cx(INPUT, 'h-auto py-2')}
            />
          ),
          true,
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? labels.working : labels.submit}
        </Button>
        <Link href={cancelHref} className={buttonClasses('ghost', 'sm')}>
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
