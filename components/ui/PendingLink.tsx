'use client';

import Link, { useLinkStatus } from 'next/link';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * The spinner, once the wait is long enough to be worth showing. Under ~150ms
 * the page is already there, and a flash of a spinner reads as a glitch.
 */
function Pending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!show) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70',
        className,
      )}
    />
  );
}

/**
 * A link that says it heard you: while the next page is being fetched, a small
 * spinner turns inside the link that was tapped. Everything else is `next/link`.
 * The page itself is unchanged until its content arrives, so a not-found page
 * still answers 404 — which a `loading.tsx` boundary would have turned into 200.
 */
export function PendingLink({
  children,
  spinnerClassName,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode; spinnerClassName?: string }) {
  return (
    <Link {...props}>
      {children}
      <Pending className={spinnerClassName} />
    </Link>
  );
}
