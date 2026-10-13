'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { Field, FormMessage, PinInput } from '../../_auth/fields';
import { changePinAction } from '../accountActions';
import { CHANGE_PIN_INITIAL, type ChangePinState } from '../pinState';

export interface ChangePinLabels {
  title: string;
  current: string;
  pin: string;
  pinHint: string;
  pinConfirm: string;
  submit: string;
  working: string;
  errors: Record<string, string>;
}

/**
 * A new PIN: the current one, then the new one twice. Folded away until
 * needed; success comes back as the dashboard's banner.
 */
export function ChangePin({ locale, labels }: { locale: Locale; labels: ChangePinLabels }) {
  const [state, formAction, pending] = useActionState<ChangePinState, FormData>(changePinAction, CHANGE_PIN_INITIAL);
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  return (
    // Left to the user while idle: a controlled `open={false}` would snap the
    // panel shut on any re-render. Forced open only to show an error.
    <details className="rounded-xl bg-white p-6 shadow-card-sm" open={state.status !== 'idle' || undefined}>
      <summary className="cursor-pointer list-none text-[15px] font-bold text-text">{labels.title}</summary>
      <form action={formAction} onSubmit={submitKeepingValues(formAction)} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <Field id="pin-current" label={labels.current} error={error('current')}>
          <PinInput id="pin-current" name="current" required autoComplete="current-password" invalid={Boolean(error('current'))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pin-new" label={labels.pin} hint={labels.pinHint} error={error('pin')}>
            <PinInput id="pin-new" name="pin" required autoComplete="new-password" invalid={Boolean(error('pin'))} />
          </Field>
          <Field id="pin-confirm" label={labels.pinConfirm} error={error('pinConfirm')}>
            <PinInput id="pin-confirm" name="pinConfirm" required autoComplete="new-password" invalid={Boolean(error('pinConfirm'))} />
          </Field>
        </div>
        {state.formError && <FormMessage tone="error">{labels.errors[state.formError] ?? labels.errors.server_error}</FormMessage>}
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? labels.working : labels.submit}
          </Button>
        </div>
      </form>
    </details>
  );
}
