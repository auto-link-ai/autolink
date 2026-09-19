import type { InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

/** Labelled input with optional hint and error, wired up with aria attributes. */
export function Field({ id, label, hint, error, className, ...inputProps }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={cx(hintId, errorId) || undefined}
        aria-invalid={error ? true : undefined}
        className="h-12 w-full rounded-sm border border-border-strong bg-surface px-3 text-[15px] text-text placeholder:text-text-muted focus-visible:border-accent aria-[invalid=true]:border-danger"
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
