import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Floating chip used over the hero visual and in the demo: an orange icon tile,
 * a title and one supporting line. Purely presentational.
 */
export function NotificationCard({
  icon,
  title,
  body,
  className,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-card-lg backdrop-blur', className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-tight text-text">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-text-muted">{body}</p>
      </div>
    </div>
  );
}
