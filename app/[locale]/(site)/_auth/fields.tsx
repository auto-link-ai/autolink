import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The inputs every owner form shares — sign-in, activation, PIN reset, change
 * PIN — so a phone number or a PIN looks and behaves the same everywhere: the
 * right keypad on a phone, big enough to tap, read left-to-right in Arabic too.
 */
export const INPUT =
  'h-12 w-full rounded-2xl border border-border bg-white px-4 text-[16px] text-text outline-none placeholder:text-text-muted focus:border-accent aria-[invalid=true]:border-danger';

export function Field({
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
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-sm text-text-muted">{hint}</span>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string; invalid?: boolean };

/** An Algerian mobile: the phone keypad, written left to right even in Arabic. */
export function PhoneInput({ id, invalid, className, ...rest }: InputProps) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      dir="ltr"
      autoComplete="tel"
      placeholder="05 12 34 56 78"
      maxLength={20}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cx(INPUT, 'rtl:text-end', className)}
      {...rest}
    />
  );
}

/**
 * Four digits, shown as dots: the number keypad, wide letter spacing so each
 * digit has its place. `new-password` for a PIN being chosen, so a password
 * manager offers to save it rather than to fill an old one.
 */
export function PinInput({ id, invalid, className, ...rest }: InputProps) {
  return (
    <input
      id={id}
      type="password"
      inputMode="numeric"
      pattern="[0-9٠-٩]*"
      maxLength={4}
      dir="ltr"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cx(INPUT, 'h-14 text-center font-mono text-2xl tracking-[0.6em]', className)}
      {...rest}
    />
  );
}

/** The 6-digit WhatsApp code: phones offer to paste it from the message. */
export function CodeInput({ id, invalid, className, ...rest }: InputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9٠-٩ ]*"
      maxLength={8}
      dir="ltr"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cx(INPUT, 'h-14 text-center font-mono text-2xl tracking-[0.4em]', className)}
      {...rest}
    />
  );
}

/** One form-level message: an error in red, a notice in green. */
export function FormMessage({ tone, children }: { tone: 'error' | 'notice'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-2xl px-4 py-3 text-sm font-medium',
        tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
      )}
    >
      {children}
    </p>
  );
}
