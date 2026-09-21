'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

/**
 * A password field with a Show / Hide switch. On a phone, typing a password
 * blind is where most sign-in failures come from — and an admin-issued one is
 * twenty characters long.
 *
 * The switch is a real button with its own label, so screen readers announce
 * what it does; without JavaScript the field simply stays masked.
 */
export function PasswordInput({
  className,
  showLabel,
  hideLabel,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={cx(className, 'pe-20')} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 end-0 my-1 me-1 rounded-xl px-3 text-sm font-bold text-accent hover:bg-surface-3"
      >
        {visible ? hideLabel : showLabel}
      </button>
    </div>
  );
}
