'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import type { CareSection } from '@/lib/care/sections';
import { cx } from '@/lib/cx';
import { saveCareAction } from '../actions';
import { CARE_FORM_INITIAL, type CareFormLabels, type CareFormState, type FieldSpec } from '../careState';

const CONTROL =
  'w-full rounded-2xl border border-border-strong bg-white px-4 text-base text-text outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-danger';

function Control({
  field,
  id,
  typed,
  describedBy,
  invalid,
}: {
  field: FieldSpec;
  id: string;
  /** What was typed before a failed save, if the server sent it back. */
  typed?: string;
  describedBy?: string;
  invalid: boolean;
}) {
  const common = {
    id,
    name: field.name,
    defaultValue: typed ?? field.value ?? '',
    required: field.required,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    dir: field.ltr ? ('ltr' as const) : undefined,
  };
  if (field.kind === 'select') {
    return (
      <select {...common} className={cx(CONTROL, 'h-12')}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === 'textarea') {
    return <textarea {...common} rows={6} maxLength={field.maxLength} className={cx(CONTROL, 'py-3 leading-relaxed')} />;
  }
  return (
    <input
      {...common}
      // Numbers are typed as text with a numeric keypad: "85 000" stays readable,
      // and anything odd is explained by the server instead of silently dropped.
      type={field.kind === 'date' ? 'date' : 'text'}
      inputMode={field.kind === 'number' ? 'numeric' : undefined}
      maxLength={field.maxLength}
      autoCapitalize={field.autoCapitalize}
      spellCheck={field.ltr ? false : undefined}
      className={cx(CONTROL, 'h-12', field.ltr && 'rtl:text-end')}
    />
  );
}

/**
 * One car book form. Each field shows its own error under it; a failed save
 * moves focus to a short list of what to correct, each item a link to its
 * field. What was typed stays. On success the server moves on to the read view.
 */
export function CareForm({
  locale,
  tagId,
  section,
  fields,
  labels,
  cancelHref,
}: {
  locale: Locale;
  tagId: string;
  section: CareSection;
  fields: FieldSpec[];
  labels: CareFormLabels;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<CareFormState, FormData>(saveCareAction, CARE_FORM_INITIAL);
  const summary = useRef<HTMLDivElement>(null);
  const errorOf = (name: string) => {
    const code = state.fieldErrors?.[name];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };
  const problems = fields.filter((field) => errorOf(field.name));

  useEffect(() => {
    if (state.status === 'error') summary.current?.focus();
  }, [state]);

  const idOf = (name: string) => `care-${section}-${name}`;

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tagId" value={tagId} />
      <input type="hidden" name="section" value={section} />

      {(problems.length > 0 || state.formError) && (
        <div
          ref={summary}
          tabIndex={-1}
          aria-labelledby={`care-${section}-problems`}
          className="rounded-2xl border border-danger/30 bg-danger/5 p-4 outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <p id={`care-${section}-problems`} className="font-bold text-danger">
            {state.formError ? (labels.errors[state.formError] ?? labels.errors.server_error) : labels.fixBelow}
          </p>
          {problems.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {problems.map((field) => (
                <li key={field.name}>
                  <a href={`#${idOf(field.name)}`} className="text-sm font-semibold text-danger underline underline-offset-2">
                    {field.label} — {errorOf(field.name)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const id = idOf(field.name);
          const error = errorOf(field.name);
          const describedBy = cx(field.hint && `${id}-hint`, error && `${id}-error`) || undefined;
          return (
            <div key={field.name} className={cx('flex flex-col gap-1.5', (field.wide || field.kind === 'textarea') && 'sm:col-span-2')}>
              <label htmlFor={id} className="text-[15px] font-bold text-text">
                {field.label}
                {field.required && <span className="ms-1 font-normal text-text-secondary">{labels.required}</span>}
              </label>
              {field.hint && (
                <p id={`${id}-hint`} className="text-sm text-text-muted">
                  {field.hint}
                </p>
              )}
              <Control
                field={field}
                id={id}
                typed={state.values?.[field.name]}
                describedBy={describedBy}
                invalid={Boolean(error)}
              />
              {error && (
                <p id={`${id}-error`} className="text-sm font-semibold text-danger">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <a href={cancelHref} className={buttonClasses('secondary', 'md', 'w-full sm:w-auto')}>
          {labels.cancel}
        </a>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? labels.working : labels.submit}
        </Button>
      </div>
    </form>
  );
}
