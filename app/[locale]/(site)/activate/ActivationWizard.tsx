'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { ACTIVATION_INITIAL, type ActivationState } from '@/lib/activation/state';
import { cx } from '@/lib/cx';
import { CodeFields, type CodeLabels } from '../_auth/CodeFields';
import { Field, FormMessage, INPUT, PhoneInput, PinInput } from '../_auth/fields';
import { activationAction } from './actions';
import { CarFields, type CarLabels } from './CarFields';

export interface WizardLabels {
  steps: { details: string; code: string; done: string };
  you: string;
  car: string;
  pinTitle: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneHint: string;
  pin: string;
  pinHint: string;
  pinConfirm: string;
  privacy: string;
  submit: string;
  submitting: string;
  activate: string;
  activating: string;
  carLabels: CarLabels;
  code: CodeLabels;
  errors: Record<string, string>;
}

function Steps({ current, labels }: { current: 0 | 1 | 2; labels: WizardLabels['steps'] }) {
  const items = [labels.details, labels.code, labels.done];
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm font-bold" aria-label={items.join(' · ')}>
      {items.map((label, index) => (
        <li key={label} aria-current={index === current ? 'step' : undefined} className="flex flex-1 items-center gap-2">
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
              index <= current ? 'bg-accent text-accent-ink' : 'bg-surface-3 text-text-muted',
            )}
          >
            {index + 1}
          </span>
          <span className={index === current ? 'text-text' : 'text-text-muted'}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-4 text-[17px] font-bold text-text">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Activating a sticker, signed out — exactly as the founder asked: one screen
 * (name, phone, car, PIN twice), the WhatsApp code, done.
 *
 * One form throughout. The first screen's fields stay in it, hidden, while the
 * code is asked for: the PIN goes to the server again with the code (it is
 * never stored before the phone is proven), and « Changer le numéro » simply
 * shows them again. Success redirects to /activate/done.
 */
export function ActivationWizard({ locale, tagId, labels, helpHref }: { locale: Locale; tagId: string; labels: WizardLabels; helpHref: string }) {
  const [state, formAction, pending] = useActionState<ActivationState, FormData>(activationAction, ACTIVATION_INITIAL);
  const [editing, setEditing] = useState(false);
  const submit = submitKeepingValues(formAction);
  const step = editing ? 'details' : state.step;
  const message = (code: string | undefined) => (code ? (labels.errors[code] ?? labels.errors.invalid) : undefined);
  const errors = state.step === 'details' ? (state.fieldErrors ?? {}) : {};
  const field = (name: string) => message(errors[name]);

  return (
    <>
      <Steps current={step === 'details' ? 0 : 1} labels={labels.steps} />
      <form
        action={formAction}
        onSubmit={(event) => {
          setEditing(false);
          submit(event);
        }}
        className="flex flex-col gap-8 rounded-xl bg-white p-6 shadow-card-sm md:p-8"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="tagId" value={tagId} />
        {state.step === 'code' && <input type="hidden" name="challengeId" value={state.challengeId} />}

        <div hidden={step !== 'details'} className="flex flex-col gap-8">
          <Section title={labels.you}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="act-first" label={labels.firstName} error={field('firstName')}>
                <input id="act-first" name="firstName" required maxLength={40} autoComplete="given-name" className={INPUT} />
              </Field>
              <Field id="act-last" label={labels.lastName} error={field('lastName')}>
                <input id="act-last" name="lastName" required maxLength={40} autoComplete="family-name" className={INPUT} />
              </Field>
            </div>
            <Field id="act-phone" label={labels.phone} hint={labels.phoneHint} error={field('phone')}>
              <PhoneInput id="act-phone" name="phone" required invalid={Boolean(field('phone'))} />
            </Field>
          </Section>

          <Section title={labels.car}>
            <CarFields
              labels={labels.carLabels}
              errors={{ brand: field('brand'), brandOther: field('brandOther'), model: field('model') }}
              required
            />
          </Section>

          <Section title={labels.pinTitle}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="act-pin" label={labels.pin} hint={labels.pinHint} error={field('pin')}>
                <PinInput id="act-pin" name="pin" required autoComplete="new-password" invalid={Boolean(field('pin'))} />
              </Field>
              <Field id="act-pin-confirm" label={labels.pinConfirm} error={field('pinConfirm')}>
                <PinInput id="act-pin-confirm" name="pinConfirm" required autoComplete="new-password" invalid={Boolean(field('pinConfirm'))} />
              </Field>
            </div>
          </Section>

          {step === 'details' && state.step === 'details' && state.formError && (
            <FormMessage tone="error">{message(state.formError)}</FormMessage>
          )}
          {step === 'details' && (
            <div className="flex flex-col gap-3">
              <Button type="submit" name="step" value="details" disabled={pending}>
                {pending ? labels.submitting : labels.submit}
              </Button>
              <p className="text-center text-sm text-text-muted">{labels.privacy}</p>
            </div>
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
            {/* The PIN is checked again with the code: a problem with it shows here. */}
            {(state.fieldErrors?.pin || state.fieldErrors?.pinConfirm) && (
              <FormMessage tone="error">{message(state.fieldErrors.pin ?? state.fieldErrors.pinConfirm)}</FormMessage>
            )}
            {state.formError && <FormMessage tone="error">{message(state.formError)}</FormMessage>}
            <Button type="submit" name="step" value="code" disabled={pending}>
              {pending ? labels.activating : labels.activate}
            </Button>
          </CodeFields>
        )}
      </form>
    </>
  );
}
