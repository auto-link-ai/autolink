'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { resetCustomerPasswordAction } from '../actions';
import { RESET_PASSWORD_INITIAL, type ResetPasswordState } from '../state';

export interface ResetPasswordLabels {
  submit: string;
  working: string;
  hint: string;
  done: string;
  errors: Record<string, string>;
}

/**
 * The new password is rendered from the action's return value, so it appears
 * once on this screen and never reaches the URL or the history.
 */
export function ResetPasswordForm({
  locale,
  publicUserId,
  labels,
}: {
  locale: Locale;
  publicUserId: string;
  labels: ResetPasswordLabels;
}) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetCustomerPasswordAction,
    RESET_PASSWORD_INITIAL,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="publicUserId" value={publicUserId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? labels.working : labels.submit}
      </Button>
      <span className="ms-3 text-sm text-text-muted">{labels.hint}</span>

      {state.status === 'done' && state.password && (
        <p role="status" className="mt-3 rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {labels.done}{' '}
          <code dir="ltr" className="font-mono text-base font-bold tracking-wide text-text">
            {state.password}
          </code>
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="mt-3 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {labels.errors[state.error ?? 'server_error'] ?? labels.errors.server_error}
        </p>
      )}
    </form>
  );
}
