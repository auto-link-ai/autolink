'use client';

import type { ReactNode } from 'react';
import { CodeInput, Field, FormMessage } from './fields';

export interface CodeLabels {
  code: string;
  codeHint: string;
  /** « Code envoyé sur WhatsApp au » — the number follows, left to right. */
  sentTo: string;
  resend: string;
  resent: string;
  changeNumber: string;
  notReceived: string;
  writeUs: string;
}

/**
 * The WhatsApp code step, shared by activation and « PIN oublié »: which number
 * it went to, the 6 digits, and the ways out — send it again, fix the number,
 * or write to us when nothing arrives (the send itself cannot tell).
 *
 * « Renvoyer » is a second submit button of the surrounding form. `children`
 * (any other fields, then the main button) render before it, so the main
 * button comes first and Enter never resends by accident.
 */
export function CodeFields({
  phoneHint,
  error,
  resent,
  labels,
  helpHref,
  onChangeNumber,
  disabled,
  children,
}: {
  phoneHint: string;
  error?: string;
  resent: boolean;
  labels: CodeLabels;
  helpHref: string;
  onChangeNumber: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-text-secondary">
        {labels.sentTo}{' '}
        <span dir="ltr" className="font-bold whitespace-nowrap text-text">
          {phoneHint}
        </span>
      </p>
      <Field id="otp-code" label={labels.code} hint={labels.codeHint} error={error}>
        <CodeInput id="otp-code" name="code" required autoFocus invalid={Boolean(error)} />
      </Field>
      {resent && <FormMessage tone="notice">{labels.resent}</FormMessage>}
      {children}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-bold">
        <button
          type="submit"
          name="step"
          value="resend"
          formNoValidate
          disabled={disabled}
          className="min-h-11 text-accent hover:underline disabled:opacity-50"
        >
          {labels.resend}
        </button>
        <button type="button" onClick={onChangeNumber} className="min-h-11 text-text-secondary hover:underline">
          {labels.changeNumber}
        </button>
      </div>
      <p className="text-sm text-text-muted">
        {labels.notReceived}{' '}
        <a href={helpHref} className="font-bold text-accent hover:underline">
          {labels.writeUs}
        </a>
      </p>
    </div>
  );
}
