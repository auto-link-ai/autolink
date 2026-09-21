'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { submitKeepingValues } from '@/components/ui/submitKeepingValues';
import type { Locale } from '@/i18n/locales';
import { changePasswordAction } from '../actions';
import { CHANGE_PASSWORD_INITIAL, type ChangePasswordState } from '../passwordState';

export interface ChangePasswordLabels {
  title: string;
  current: string;
  next: string;
  nextHint: string;
  submit: string;
  working: string;
  done: string;
  show: string;
  hide: string;
  errors: Record<string, string>;
}

const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none focus:border-accent';

/**
 * Lets an owner replace their password — above all after support has reset it
 * to a twenty-character code nobody wants to keep typing.
 */
export function ChangePassword({ locale, labels }: { locale: Locale; labels: ChangePasswordLabels }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    CHANGE_PASSWORD_INITIAL,
  );
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };

  return (
    // Left to the user while idle: a controlled `open={false}` would snap the
    // panel shut on any re-render. Forced open only to show a result.
    <details className="rounded-xl bg-white p-6 shadow-card-sm" open={state.status !== 'idle' || undefined}>
      <summary className="cursor-pointer list-none text-[15px] font-bold text-text">{labels.title}</summary>

      {state.status === 'done' ? (
        <p role="status" className="mt-4 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          {labels.done}
        </p>
      ) : (
        <form action={formAction} onSubmit={submitKeepingValues(formAction)} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-current" className="text-sm font-bold text-text">
              {labels.current}
            </label>
            <PasswordInput
              id="pw-current"
              name="current"
              required
              autoComplete="current-password"
              className={INPUT}
              showLabel={labels.show}
              hideLabel={labels.hide}
            />
            {error('current') && <span className="text-sm font-medium text-danger">{error('current')}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-next" className="text-sm font-bold text-text">
              {labels.next}
            </label>
            <PasswordInput
              id="pw-next"
              name="next"
              required
              autoComplete="new-password"
              className={INPUT}
              showLabel={labels.show}
              hideLabel={labels.hide}
            />
            {error('next') ? (
              <span className="text-sm font-medium text-danger">{error('next')}</span>
            ) : (
              <span className="text-sm text-text-muted">{labels.nextHint}</span>
            )}
          </div>

          {state.formError && (
            <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {labels.errors[state.formError] ?? labels.errors.server_error}
            </p>
          )}

          <div>
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              {pending ? labels.working : labels.submit}
            </Button>
          </div>
        </form>
      )}
    </details>
  );
}
