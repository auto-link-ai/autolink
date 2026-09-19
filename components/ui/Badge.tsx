import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

// Text + border carry the state too, never colour alone.
const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border-strong bg-surface-2 text-text-secondary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-amber-600/30 bg-amber-50 text-amber-800',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-accent/30 bg-accent/10 text-accent',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', TONES[tone])}>
      {children}
    </span>
  );
}
