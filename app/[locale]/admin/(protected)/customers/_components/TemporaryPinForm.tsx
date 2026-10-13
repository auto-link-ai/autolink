'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { issueTemporaryPinAction } from '../actions';
import { TEMPORARY_PIN_INITIAL, type TemporaryPinState } from '../state';

export interface TemporaryPinLabels {
  submit: string;
  working: string;
  hint: string;
  done: string;
  /** What the customer does next, under the PIN. */
  next: string;
  errors: Record<NonNullable<TemporaryPinState['error']>, string>;
}

/**
 * The new PIN is rendered from the action's return value, so it appears once
 * on this screen and never reaches the URL or the history.
 */
export function TemporaryPinForm({
  locale,
  publicUserId,
  labels,
}: {
  locale: Locale;
  publicUserId: string;
  labels: TemporaryPinLabels;
}) {
  const [state, formAction, pending] = useActionState<TemporaryPinState, FormData>(
    issueTemporaryPinAction,
    TEMPORARY_PIN_INITIAL,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="publicUserId" value={publicUserId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? labels.working : labels.submit}
      </Button>
      <span className="ms-3 text-sm text-text-muted">{labels.hint}</span>

      {state.status === 'done' && state.pin && (
        <div role="status" className="mt-3 rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <p>
            {labels.done}{' '}
            <code dir="ltr" className="font-mono text-base font-bold tracking-widest text-text">
              {state.pin}
            </code>
          </p>
          <p className="mt-1 text-text">{labels.next}</p>
        </div>
      )}
      {state.status === 'error' && state.error && (
        <p role="alert" className="mt-3 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {labels.errors[state.error]}
        </p>
      )}
    </form>
  );
}
