'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import type { ResetState } from '@/lib/auth/pinReset';
import { CodeFields, type CodeLabels } from '../_auth/CodeFields';
import { Field, FormMessage, PhoneInput, PinInput } from '../_auth/fields';
import { pinResetAction } from './actions';

export interface ForgotPinLabels {
  phone: string;
  phoneHint: string;
  sendCode: string;
  sending: string;
  newPin: string;
  newPinHint: string;
  pinConfirm: string;
  submit: string;
  submitting: string;
  code: CodeLabels;
  errors: Record<string, string>;
}

const INITIAL: ResetState = { step: 'phone' };

/**
 * « Code PIN oublié ? » in one form: the number, then the WhatsApp code with
 * the new PIN twice. The number stays in the form (hidden) while the code is
 * asked for, so « Changer le numéro » just shows it again.
 */
export function ForgotPinForm({ locale, labels, helpHref }: { locale: Locale; labels: ForgotPinLabels; helpHref: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(pinResetAction, INITIAL);
  const [editing, setEditing] = useState(false);
  const step = editing ? 'phone' : state.step;
  const message = (code: string | undefined) => (code ? (labels.errors[code] ?? labels.errors.invalid) : undefined);
  const submit = submitKeepingValues(formAction);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        setEditing(false);
        submit(event);
      }}
      className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      {state.step === 'code' && <input type="hidden" name="challengeId" value={state.challengeId} />}

      <div hidden={step !== 'phone'} className="flex flex-col gap-5">
        <Field id="reset-phone" label={labels.phone} hint={labels.phoneHint} error={step === 'phone' ? message(state.fieldErrors?.phone) : undefined}>
          <PhoneInput id="reset-phone" name="phone" required={step === 'phone'} />
        </Field>
        {step === 'phone' && state.formError && (
          <FormMessage tone="error">{message(state.formError)}</FormMessage>
        )}
        {step === 'phone' && (
          <Button type="submit" name="step" value="phone" disabled={pending}>
            {pending ? labels.sending : labels.sendCode}
          </Button>
        )}
      </div>

      {step === 'code' && state.step === 'code' && (
        <CodeFields
          phoneHint={state.phoneHint}
          error={message(state.fieldErrors?.code)}
          resent={state.notice === 'resent'}
          labels={labels.code}
          helpHref={helpHref}
          onChangeNumber={() => setEditing(true)}
          disabled={pending}
        >
          <Field id="reset-pin" label={labels.newPin} hint={labels.newPinHint} error={message(state.fieldErrors?.pin)}>
            <PinInput id="reset-pin" name="pin" required autoComplete="new-password" invalid={Boolean(state.fieldErrors?.pin)} />
          </Field>
          <Field id="reset-pin-confirm" label={labels.pinConfirm} error={message(state.fieldErrors?.pinConfirm)}>
            <PinInput
              id="reset-pin-confirm"
              name="pinConfirm"
              required
              autoComplete="new-password"
              invalid={Boolean(state.fieldErrors?.pinConfirm)}
            />
          </Field>
          {state.formError && <FormMessage tone="error">{message(state.formError)}</FormMessage>}
          <Button type="submit" name="step" value="code" disabled={pending}>
            {pending ? labels.submitting : labels.submit}
          </Button>
        </CodeFields>
      )}
    </form>
  );
}
