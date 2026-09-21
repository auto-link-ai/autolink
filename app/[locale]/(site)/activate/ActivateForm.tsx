'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { activateAction } from './actions';
import { ACTIVATE_FORM_INITIAL, type ActivateFormState } from './state';

export interface ActivateLabels {
  tagId: string;
  tagIdHint: string;
  code: string;
  codeHint: string;
  brand: string;
  model: string;
  color: string;
  plate: string;
  plateHint: string;
  showDetails: string;
  showDetailsHint: string;
  /** Common colours in the reader's language, offered as suggestions. */
  colors: string[];
  submit: string;
  submitting: string;
  errors: Record<string, string>;
}

const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent';

/** The makes most seen on Algerian roads. Brand names read the same in every language. */
const COMMON_MAKES = [
  'Renault',
  'Peugeot',
  'Dacia',
  'Hyundai',
  'Kia',
  'Volkswagen',
  'Toyota',
  'Citroën',
  'Chevrolet',
  'Suzuki',
  'Fiat',
  'Seat',
  'Skoda',
  'Nissan',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Chery',
  'Geely',
  'Mitsubishi',
] as const;

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

export function ActivateForm({
  locale,
  labels,
  defaultTagId = '',
  defaultCode = '',
}: {
  locale: Locale;
  labels: ActivateLabels;
  defaultTagId?: string;
  defaultCode?: string;
}) {
  const [state, formAction, pending] = useActionState<ActivateFormState, FormData>(
    activateAction,
    ACTIVATE_FORM_INITIAL,
  );
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-card-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="act-tag" label={labels.tagId} hint={labels.tagIdHint}>
          <input
            id="act-tag"
            name="tagId"
            required
            dir="ltr"
            defaultValue={defaultTagId}
            placeholder="AUT-XXXXXXXX"
            className={cx(INPUT, 'font-mono uppercase')}
          />
        </Field>
        <Field id="act-code" label={labels.code} hint={labels.codeHint}>
          <input
            id="act-code"
            name="code"
            required
            dir="ltr"
            defaultValue={defaultCode}
            placeholder="XXXX-XXXX-XX"
            className={cx(INPUT, 'font-mono uppercase')}
          />
        </Field>
      </div>

      <div className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
        <Field id="act-brand" label={labels.brand} error={error('brand')}>
          <input id="act-brand" name="brand" required maxLength={40} list="act-makes" autoComplete="off" className={INPUT} />
          {/* Suggestions, not a restriction: any make can still be typed. */}
          <datalist id="act-makes">
            {COMMON_MAKES.map((make) => (
              <option key={make} value={make} />
            ))}
          </datalist>
        </Field>
        <Field id="act-model" label={labels.model} error={error('model')}>
          <input id="act-model" name="model" required maxLength={40} className={INPUT} />
        </Field>
        <Field id="act-color" label={labels.color} error={error('color')}>
          <input id="act-color" name="color" required maxLength={30} list="act-colors" autoComplete="off" className={INPUT} />
          <datalist id="act-colors">
            {labels.colors.map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
        </Field>
        <Field id="act-plate" label={labels.plate} hint={labels.plateHint} error={error('plateNumber')}>
          <input id="act-plate" name="plateNumber" maxLength={20} dir="ltr" className={INPUT} />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-2xl bg-surface-3 p-4">
        <input
          type="checkbox"
          name="showDetailsPublicly"
          defaultChecked
          className="mt-0.5 h-5 w-5 accent-[var(--orange)]"
        />
        <span>
          <span className="block text-sm font-bold text-text">{labels.showDetails}</span>
          <span className="mt-0.5 block text-sm text-text-secondary">{labels.showDetailsHint}</span>
        </span>
      </label>

      {state.formError && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {labels.errors[state.formError] ?? labels.errors.server_error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
