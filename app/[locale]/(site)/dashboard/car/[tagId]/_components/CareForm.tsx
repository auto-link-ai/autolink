'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import type { CareSection } from '@/lib/validation/carCare';
import { saveCareAction } from '../actions';
import { CARE_FORM_INITIAL, type CareFormState } from '../careState';

export interface CareFormLabels {
  submit: string;
  working: string;
  done: string;
  checkFields: string;
  /** Field name → its label, to name the field in an error. */
  fields: Record<string, string>;
  errors: Record<string, string>;
}

/**
 * One car book form. The fields are server-rendered children; this adds the
 * submit, the result and the errors. What was typed stays after an error; a
 * log form (`resetOnSave`) empties once its entry is in, ready for the next.
 */
export function CareForm({
  locale,
  tagId,
  section,
  labels,
  resetOnSave = false,
  children,
}: {
  locale: Locale;
  tagId: string;
  section: CareSection;
  labels: CareFormLabels;
  resetOnSave?: boolean;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<CareFormState, FormData>(saveCareAction, CARE_FORM_INITIAL);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSave && state.status === 'saved') form.current?.reset();
  }, [state, resetOnSave]);

  const problems = Object.entries(state.fieldErrors ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return (
    <form ref={form} action={formAction} onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tagId" value={tagId} />
      <input type="hidden" name="section" value={section} />

      {children}

      {problems.length > 0 && (
        <div role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="font-bold">{labels.checkFields}</p>
          <ul className="mt-1 list-disc ps-5">
            {problems.map(([field, code]) => (
              <li key={field}>
                {labels.fields[field] ?? field} — {labels.errors[code] ?? labels.errors.invalid}
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.formError && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {labels.errors[state.formError] ?? labels.errors.server_error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? labels.working : labels.submit}
        </Button>
        {state.status === 'saved' && !pending && (
          <p role="status" className="text-sm font-bold text-success">
            {labels.done}
          </p>
        )}
      </div>
    </form>
  );
}
