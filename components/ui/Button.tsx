import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  // Solid orange pill, soft warm shadow that lifts on hover.
  primary:
    'rounded-full bg-accent text-accent-ink shadow-card-md hover:bg-accent-hover hover:-translate-y-px active:translate-y-0',
  secondary: 'rounded-full border border-border-strong bg-white text-text hover:bg-surface-2',
  danger: 'rounded-full border border-danger/40 bg-white text-danger hover:bg-danger/5',
  ghost: 'rounded-full text-text-secondary hover:bg-surface-3 hover:text-text',
};

// Both sizes keep the 44px minimum touch target.
const SIZES: Record<Size, string> = {
  md: 'h-13 px-7 text-[16px]',
  sm: 'h-11 px-5 text-sm',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
