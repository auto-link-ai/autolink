'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { updateCustomerContactAction } from '../actions';
import { CONTACT_INITIAL, type ContactField, type ContactState } from '../state';

const INPUT =
  'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent aria-[invalid=true]:border-danger';

export interface ContactFormLabels {
  fields: Record<ContactField, string>;
  phoneHint: string;
  submit: string;
  working: string;
  /** Field error codes (lib/validation/auth.ts, and phone_taken) → words. */
  errors: Record<string, string>;
  /** Refusals for the whole form. */
  formErrors: Record<NonNullable<ContactState['formError']>, string>;
}

/**
 * Correcting a customer's name, or moving them to a new number. Each error
 * sits under its field and what was typed stays; a save goes back to the list,
 * which says so.
 */
export function ContactForm({
  locale,
  publicUserId,
  returnSearch,
  values,
  labels,
}: {
  locale: Locale;
  publicUserId: string;
  returnSearch: string;
  values: Record<ContactField, string>;
  labels: ContactFormLabels;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(updateCustomerContactAction, CONTACT_INITIAL);

  const input = (name: ContactField, extra: { type?: string; dir?: 'ltr'; maxLength: number; hintId?: string }) => {
    const id = `customer-${name}`;
    const code = state.fieldErrors?.[name];
    const error = code ? (labels.errors[code] ?? labels.errors.required) : undefined;
    const describedBy = [error && `${id}-error`, extra.hintId].filter(Boolean).join(' ');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-text">
          {labels.fields[name]}
        </label>
        <input
          id={id}
          name={name}
          type={extra.type ?? 'text'}
          dir={extra.dir}
          maxLength={extra.maxLength}
          defaultValue={values[name]}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cx(INPUT, extra.dir && 'rtl:text-end')}
        />
        {error && (
          <p id={`${id}-error`} className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="publicUserId" value={publicUserId} />
      <input type="hidden" name="returnSearch" value={returnSearch} />

      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {labels.formErrors[state.formError]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {input('firstName', { maxLength: 40 })}
        {input('lastName', { maxLength: 40 })}
        {input('phone', { type: 'tel', dir: 'ltr', maxLength: 20, hintId: 'customer-phone-hint' })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? labels.working : labels.submit}
        </Button>
        <span id="customer-phone-hint" className="text-sm text-text-muted">
          {labels.phoneHint}
        </span>
      </div>
    </form>
  );
}
