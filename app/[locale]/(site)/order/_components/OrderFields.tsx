'use client';

import type { ReactNode } from 'react';
import { CheckIcon } from '@/components/site/icons';
import { cx } from '@/lib/cx';
import { DELIVERY_TYPES, ORDER_FIELD_LIMITS as L, type DeliveryType } from '@/lib/domain/constants';
import type { OrderFormLabels } from '../orderLabels';

export const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent aria-[invalid=true]:border-danger';

/**
 * Label, control, then hint or error. The label points at the control by id
 * rather than wrapping it: a wrapping label would swallow every <option> of a
 * select into its own text, leaving the field without a usable name.
 */
export function Field({
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
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-sm text-text-muted">{hint}</span>
      )}
    </div>
  );
}

/** What every field group needs: its words, and the error for one field. */
interface GroupProps {
  labels: OrderFormLabels;
  errorOf: (field: string) => string | undefined;
}

const invalid = (error: string | undefined, id: string) =>
  error ? ({ 'aria-invalid': true, 'aria-describedby': `${id}-error` } as const) : {};

export function QuantityFields({
  labels,
  errorOf,
  maxQuantity,
  quantity,
  onQuantity,
}: GroupProps & { maxQuantity: number; quantity: number; onQuantity: (value: number) => void }) {
  const error = errorOf('quantity');
  return (
    <Field id="order-quantity" label={labels.fields.quantity} error={error}>
      <select
        id="order-quantity"
        name="quantity"
        value={quantity}
        onChange={(event) => onQuantity(Number(event.target.value))}
        className={cx(INPUT, 'max-w-40')}
        {...invalid(error, 'order-quantity')}
      >
        {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ContactFields({ labels, errorOf }: GroupProps) {
  const nameError = errorOf('customerName');
  const phoneError = errorOf('phone');
  const emailError = errorOf('email');
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field id="order-name" label={labels.fields.name} error={nameError}>
          <input
            id="order-name"
            name="customerName"
            maxLength={L.name.max}
            autoComplete="name"
            className={INPUT}
            {...invalid(nameError, 'order-name')}
          />
        </Field>
      </div>
      <Field id="order-phone" label={labels.fields.phone} hint={labels.fields.phoneHint} error={phoneError}>
        <input
          id="order-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          className={cx(INPUT, 'rtl:text-end')}
          {...invalid(phoneError, 'order-phone')}
        />
      </Field>
      <Field id="order-email" label={labels.fields.email} hint={labels.fields.emailHint} error={emailError}>
        <input
          id="order-email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          maxLength={L.email.max}
          className={cx(INPUT, 'rtl:text-end')}
          {...invalid(emailError, 'order-email')}
        />
      </Field>
    </div>
  );
}

export function DeliveryFields({
  labels,
  errorOf,
  wilayas,
  wilayaCode,
  onWilaya,
  deliveryType,
  onDeliveryType,
}: GroupProps & {
  wilayas: { code: number; name: string }[];
  wilayaCode: number | '';
  onWilaya: (code: number) => void;
  deliveryType: DeliveryType;
  onDeliveryType: (type: DeliveryType) => void;
}) {
  const wilayaError = errorOf('wilayaCode');
  const communeError = errorOf('commune');
  const addressError = errorOf('address');
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="order-wilaya" label={labels.fields.wilaya} error={wilayaError}>
        <select
          id="order-wilaya"
          name="wilayaCode"
          value={wilayaCode}
          onChange={(event) => onWilaya(Number(event.target.value))}
          className={INPUT}
          {...invalid(wilayaError, 'order-wilaya')}
        >
          <option value="">{labels.fields.wilayaPlaceholder}</option>
          {wilayas.map((wilaya) => (
            <option key={wilaya.code} value={wilaya.code}>
              {String(wilaya.code).padStart(2, '0')} — {wilaya.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="order-commune" label={labels.fields.commune} error={communeError}>
        <input
          id="order-commune"
          name="commune"
          maxLength={L.commune.max}
          className={INPUT}
          {...invalid(communeError, 'order-commune')}
        />
      </Field>

      <div className="sm:col-span-2">
        <Field id="order-address" label={labels.fields.address} error={addressError}>
          <input
            id="order-address"
            name="address"
            maxLength={L.address.max}
            autoComplete="street-address"
            className={INPUT}
            {...invalid(addressError, 'order-address')}
          />
        </Field>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-bold text-text">{labels.fields.deliveryType}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {DELIVERY_TYPES.map((type) => (
            <label
              key={type}
              className={cx(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-[15px] font-semibold',
                deliveryType === type ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text',
              )}
            >
              <input
                type="radio"
                name="deliveryType"
                value={type}
                checked={deliveryType === type}
                onChange={() => onDeliveryType(type)}
                className="sr-only"
              />
              <span
                className={cx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  deliveryType === type ? 'border-accent bg-accent text-white' : 'border-border-strong',
                )}
              >
                {deliveryType === type && <CheckIcon className="h-3 w-3" />}
              </span>
              {type === 'HOME' ? labels.fields.home : labels.fields.stopdesk}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <Field id="order-notes" label={labels.fields.notes} hint={labels.fields.notesHint} error={errorOf('deliveryNotes')}>
          <textarea id="order-notes" name="deliveryNotes" maxLength={L.notes.max} rows={3} className={cx(INPUT, 'h-auto py-3')} />
        </Field>
      </div>
    </div>
  );
}
