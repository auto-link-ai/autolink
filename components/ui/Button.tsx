import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  // Design-source pill: navy outline + hard offset shadow that "presses" on hover.
  primary:
    'rounded-full border-2 border-navy bg-accent text-accent-ink shadow-hard hover:bg-accent-hover active:translate-y-px',
  secondary: 'rounded-sm border border-border-strong bg-surface text-text hover:bg-surface-2',
  danger: 'rounded-sm border border-danger/40 bg-surface text-danger hover:bg-danger/5',
  ghost: 'rounded-sm text-text-secondary hover:bg-surface-2 hover:text-text',
};

// Both sizes keep the 44px minimum touch target.
const SIZES: Record<Size, string> = {
  md: 'h-12 px-6 text-[15px]',
  sm: 'h-11 px-3 text-sm',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
