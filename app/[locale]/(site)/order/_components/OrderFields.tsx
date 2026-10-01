'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { ORDER_FIELD_LIMITS as L } from '@/lib/domain/constants';
import type { OrderFormLabels } from '../orderLabels';
import { CommuneField } from './CommuneField';

export const INPUT =
  'h-13 w-full rounded-2xl border border-border-strong bg-white px-4 text-[16px] text-text outline-none placeholder:text-text-muted focus:border-accent focus:ring-3 focus:ring-accent/15 aria-[invalid=true]:border-danger';

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

export const invalid = (error: string | undefined, id: string) =>
  error ? ({ 'aria-invalid': true, 'aria-describedby': `${id}-error` } as const) : {};

/** Who to call: the only two things we need to reach the customer. */
export function ContactFields({ labels, errorOf }: GroupProps) {
  const nameError = errorOf('customerName');
  const phoneError = errorOf('phone');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}

/** Where to deliver: wilaya (which sets the fee), commune, address. */
export function AddressFields({
  labels,
  errorOf,
  wilayas,
  wilayaCode,
  onWilaya,
  communeLanguage,
}: GroupProps & {
  wilayas: { code: number; name: string }[];
  wilayaCode: number | '';
  onWilaya: (code: number | '') => void;
  /** Which names the commune list shows: Arabic on the Arabic page. */
  communeLanguage: 'ar' | 'fr';
}) {
  const wilayaError = errorOf('wilayaCode');
  const communeError = errorOf('commune');
  const addressError = errorOf('address');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="order-wilaya" label={labels.fields.wilaya} error={wilayaError}>
        <select
          id="order-wilaya"
          name="wilayaCode"
          value={wilayaCode}
          onChange={(event) => onWilaya(event.target.value === '' ? '' : Number(event.target.value))}
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
        <CommuneField
          key={wilayaCode}
          id="order-commune"
          wilayaCode={wilayaCode}
          language={communeLanguage}
          labels={labels.commune}
          className={INPUT}
          invalidProps={invalid(communeError, 'order-commune')}
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
    </div>
  );
}

/** Optional: an e-mail in case the phone does not answer, and a note for the courier. */
export function ExtraFields({ labels, errorOf }: GroupProps) {
  const emailError = errorOf('email');
  const notesError = errorOf('deliveryNotes');
  return (
    <div className="grid gap-4 pt-4">
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
      <Field id="order-notes" label={labels.fields.notes} hint={labels.fields.notesHint} error={notesError}>
        <textarea
          id="order-notes"
          name="deliveryNotes"
          maxLength={L.notes.max}
          rows={3}
          className={cx(INPUT, 'h-auto py-3')}
          {...invalid(notesError, 'order-notes')}
        />
      </Field>
    </div>
  );
}
