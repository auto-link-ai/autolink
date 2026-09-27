'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { createCustomerAction } from '../accountActions';
import { NEW_CUSTOMER_INITIAL, type NewCustomerState } from '../accountState';

const INPUT =
  'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent aria-[invalid=true]:border-danger';

export interface NewCustomerLabels {
  email: string;
  name: string;
  phone: string;
  submit: string;
  working: string;
  cancel: string;
  done: string;
  open: string;
  errors: Record<string, string>;
}

type Field = 'email' | 'name' | 'phone';

/**
 * An account made by hand. When it is made, the temporary password shows here
 * once — it is in no URL and nowhere in the database — with a link to the
 * customer's page.
 */
export function NewCustomerForm({ locale, labels, listHref }: { locale: Locale; labels: NewCustomerLabels; listHref: string }) {
  const [state, formAction, pending] = useActionState<NewCustomerState, FormData>(createCustomerAction, NEW_CUSTOMER_INITIAL);

  if (state.status === 'done' && state.password) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-sm border border-success/30 bg-success/10 p-4">
        <p className="text-sm font-semibold text-success">{labels.done}</p>
        <p dir="ltr" className="rounded-sm bg-surface px-3 py-2 font-mono text-lg font-semibold tracking-wide text-text select-all">
          {state.password}
        </p>
        <Link href={`${listHref}?id=${state.publicUserId}`} className={buttonClasses('secondary', 'sm')}>
          {labels.open}
        </Link>
      </div>
    );
  }

  const input = (name: Field, type: string, extra: { dir?: 'ltr'; maxLength: number }) => {
    const id = `new-customer-${name}`;
    const code = state.fieldErrors?.[name];
    const error = code ? (labels.errors[code] ?? labels.errors.required) : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-text">
          {labels[name]}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          dir={extra.dir}
          maxLength={extra.maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
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
      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
          {labels.errors[state.formError]}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {input('email', 'email', { dir: 'ltr', maxLength: 254 })}
        {input('name', 'text', { maxLength: 80 })}
        {input('phone', 'tel', { dir: 'ltr', maxLength: 20 })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? labels.working : labels.submit}
        </Button>
        <Link href={listHref} className={buttonClasses('ghost', 'sm')}>
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
