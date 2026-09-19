'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useHydrated } from '@/components/ui/useHydrated';
import { downloadZip, errorMessage } from './downloadZip';

export interface GenerateBatchLabels {
  label: string;
  labelHint: string;
  quantity: string;
  quantityHint: string;
  qrTarget: string;
  submit: string;
  working: string;
  done: string;
}

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done' } | { kind: 'error'; message: string };

export function GenerateBatchForm({
  labels,
  errors,
  maxQuantity,
  maxLabelLength,
  qrBaseUrl,
  blockedReason,
}: {
  labels: GenerateBatchLabels;
  errors: Record<string, string>;
  maxQuantity: number;
  maxLabelLength: number;
  qrBaseUrl: string | null;
  /** Translated reason generation can't run (bad base URL, wrong role). */
  blockedReason: string | null;
}) {
  const router = useRouter();
  // Until hydration the form has no submit handler; a disabled submit button also blocks Enter-to-submit.
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: 'working' });
    const result = await downloadZip('/api/admin/batches', {
      label: String(data.get('label') ?? ''),
      quantity: Number(data.get('quantity')),
    });
    if (result.ok) {
      setStatus({ kind: 'done' });
      form.reset();
      router.refresh();
    } else {
      setStatus({ kind: 'error', message: errorMessage(errors, result.error, result.detail) });
    }
  }

  const working = status.kind === 'working';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-busy={working}>
      {qrBaseUrl && (
        <p className="text-sm text-text-secondary">
          {labels.qrTarget}{' '}
          <code dir="ltr" className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-text">
            {qrBaseUrl}/t/AUT-…
          </code>
        </p>
      )}
      {blockedReason && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {blockedReason}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field
          id="batch-label"
          name="label"
          label={labels.label}
          hint={labels.labelHint}
          required
          maxLength={maxLabelLength}
          disabled={working || Boolean(blockedReason)}
        />
        <Field
          id="batch-quantity"
          name="quantity"
          type="number"
          inputMode="numeric"
          label={labels.quantity}
          hint={labels.quantityHint}
          required
          min={1}
          max={maxQuantity}
          defaultValue={10}
          disabled={working || Boolean(blockedReason)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!hydrated || working || Boolean(blockedReason)}>
          {working ? labels.working : labels.submit}
        </Button>
        <p aria-live="polite" className="text-sm">
          {status.kind === 'done' && <span className="text-success">{labels.done}</span>}
          {status.kind === 'error' && <span className="text-danger">{status.message}</span>}
        </p>
      </div>
    </form>
  );
}
