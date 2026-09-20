'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { registerAction, signInAction } from './actions';
import { AUTH_FORM_INITIAL, type AuthFormState } from './state';

export interface AuthLabels {
  name?: string;
  email: string;
  phone?: string;
  phoneHint?: string;
  password: string;
  passwordHint?: string;
  submit: string;
  submitting: string;
  errors: Record<string, string>;
  switchText: string;
  switchLink: string;
}

const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent';

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

/** Sign-in and registration share one form; `mode` picks the fields and action. */
export function AuthForm({
  mode,
  locale,
  next,
  labels,
  switchHref,
}: {
  mode: 'login' | 'register';
  locale: Locale;
  next?: string;
  labels: AuthLabels;
  switchHref: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    mode === 'login' ? signInAction : registerAction,
    AUTH_FORM_INITIAL,
  );
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  return (
    <>
      <form action={formAction} className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card-sm md:p-8">
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}

        {mode === 'register' && labels.name && (
          <Field id="auth-name" label={labels.name} error={error('name')}>
            <input id="auth-name" name="name" required maxLength={80} autoComplete="name" className={INPUT} />
          </Field>
        )}

        <Field id="auth-email" label={labels.email} error={error('email')}>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="email"
            className={INPUT}
          />
        </Field>

        {mode === 'register' && labels.phone && (
          <Field id="auth-phone" label={labels.phone} hint={labels.phoneHint} error={error('phone')}>
            <input id="auth-phone" name="phone" inputMode="tel" dir="ltr" autoComplete="tel" className={INPUT} />
          </Field>
        )}

        <Field
          id="auth-password"
          label={labels.password}
          hint={mode === 'register' ? labels.passwordHint : undefined}
          error={error('password')}
        >
          <input
            id="auth-password"
            name="password"
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={INPUT}
          />
        </Field>

        {state.formError && (
          <p role="alert" className={cx('rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger')}>
            {labels.errors[state.formError] ?? labels.errors.server_error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </Button>
      </form>

      <p className="mt-5 text-[15px] text-text-secondary">
        {labels.switchText}{' '}
        <Link href={switchHref} className="font-bold text-accent hover:underline">
          {labels.switchLink}
        </Link>
      </p>
    </>
  );
}
