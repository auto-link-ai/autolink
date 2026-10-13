'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { signInAction } from './actions';
import { Field, FormMessage, PhoneInput, PinInput } from './fields';
import { AUTH_FORM_INITIAL, type AuthFormState } from './state';

export interface PinLoginLabels {
  phone: string;
  pin: string;
  forgot: string;
  forgotLink: string;
  forgotHref: string;
  submit: string;
  submitting: string;
  newHere: string;
  newHereLink: string;
  newHereHref: string;
  errors: Record<string, string>;
}

/** Sign in: the WhatsApp number and the 4-digit PIN. */
export function PinLoginForm({ locale, next, labels }: { locale: Locale; next?: string; labels: PinLoginLabels }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signInAction, AUTH_FORM_INITIAL);
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  return (
    <>
      <form
        action={formAction}
        onSubmit={submitKeepingValues(formAction)}
        className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card-sm md:p-8"
      >
        <input type="hidden" name="locale" value={locale} />
        {next && <input type="hidden" name="next" value={next} />}

        <Field id="login-phone" label={labels.phone} error={error('phone')}>
          <PhoneInput id="login-phone" name="phone" required invalid={Boolean(error('phone'))} />
        </Field>
        <Field id="login-pin" label={labels.pin} error={error('pin')}>
          <PinInput id="login-pin" name="pin" required autoComplete="current-password" invalid={Boolean(error('pin'))} />
        </Field>

        {state.formError && (
          <FormMessage tone="error">{labels.errors[state.formError] ?? labels.errors.server_error}</FormMessage>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </Button>

        <p className="text-center text-[15px] text-text-secondary">
          {labels.forgot}{' '}
          <Link href={labels.forgotHref} className="font-bold text-accent hover:underline">
            {labels.forgotLink}
          </Link>
        </p>
      </form>

      <p className="mt-5 text-[15px] text-text-secondary">
        {labels.newHere}{' '}
        <Link href={labels.newHereHref} className="font-bold text-accent hover:underline">
          {labels.newHereLink}
        </Link>
      </p>
    </>
  );
}
