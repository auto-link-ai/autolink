'use client';

import { useActionState } from 'react';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';
import { sendReportAction } from './actions';
import { REPORT_FORM_INITIAL, type ReportFormState } from './state';

export interface ReportLabels {
  category: string;
  categories: Record<string, string>;
  body: string;
  bodyHint: string;
  bodyPlaceholder: string;
  contact: string;
  contactHint: string;
  submit: string;
  sending: string;
  privacy: string;
  errors: Record<string, string>;
  challenge: string;
}

/**
 * Works without JavaScript: React posts the form to the server action either
 * way, so a stranger on a bad connection can still report a problem.
 */
export function ReportForm({
  tagId,
  labels,
  turnstileSiteKey,
}: {
  tagId: string;
  labels: ReportLabels;
  turnstileSiteKey: string | null;
}) {
  const [state, formAction, pending] = useActionState<ReportFormState, FormData>(
    sendReportAction,
    REPORT_FORM_INITIAL,
  );
  const error = (field: string) => {
    const code = state.fieldErrors?.[field];
    return code ? (labels.errors[code] ?? labels.errors.invalid) : undefined;
  };
  const needsChallenge = Boolean(state.challenge && turnstileSiteKey);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tagId" value={tagId} />

      <fieldset>
        <legend className="text-sm font-bold text-text">{labels.category}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MESSAGE_CATEGORIES.map((category, index) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-[15px] text-text has-checked:border-accent has-checked:bg-accent-soft has-checked:font-bold has-checked:text-accent"
            >
              <input
                type="radio"
                name="category"
                value={category}
                defaultChecked={index === 0}
                className="h-4 w-4 accent-[var(--orange)]"
              />
              {labels.categories[category]}
            </label>
          ))}
        </div>
        {error('category') && <p className="mt-2 text-sm font-medium text-danger">{error('category')}</p>}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-body" className="text-sm font-bold text-text">
          {labels.body}
        </label>
        <textarea
          id="report-body"
          name="body"
          rows={3}
          placeholder={labels.bodyPlaceholder}
          className="w-full rounded-2xl border border-border bg-white p-4 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent"
        />
        {error('body') ? (
          <p className="text-sm font-medium text-danger">{error('body')}</p>
        ) : (
          <span className="text-sm text-text-muted">{labels.bodyHint}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-contact" className="text-sm font-bold text-text">
          {labels.contact}
        </label>
        <input
          id="report-contact"
          name="scannerContact"
          dir="ltr"
          className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-[15px] text-text outline-none focus:border-accent"
        />
        <span className="text-sm text-text-muted">{labels.contactHint}</span>
        {error('scannerContact') && <p className="text-sm font-medium text-danger">{error('scannerContact')}</p>}
      </div>

      {needsChallenge && (
        <div>
          <p className="mb-2 text-sm text-text-secondary">{labels.challenge}</p>
          {/* Loaded only once someone has crossed the threshold. */}
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey ?? ''} />
        </div>
      )}

      {state.formError && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {labels.errors[state.formError] ?? labels.errors.server_error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cx(
          'inline-flex h-14 items-center justify-center rounded-full bg-accent px-6 text-[17px] font-bold text-accent-ink',
          pending && 'opacity-70',
        )}
      >
        {pending ? labels.sending : labels.submit}
      </button>

      <p className="text-center text-sm text-text-muted">{labels.privacy}</p>
    </form>
  );
}
