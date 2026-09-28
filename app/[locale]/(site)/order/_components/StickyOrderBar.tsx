'use client';

import { useEffect, useState, type RefObject } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

/**
 * On a phone, while the form is off screen: the price and a button that
 * brings the form back. Hidden again as soon as the form (or the footer, so
 * it never covers the last links) comes into view. Not on wide screens,
 * where the form sits beside the sticker.
 */
export function StickyOrderBar({
  form,
  label,
  amount,
  action,
}: {
  form: RefObject<HTMLElement | null>;
  label: string;
  amount: string;
  action: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = [form.current, document.querySelector('footer')].filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setShow(visible.size === 0);
    });
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [form]);

  return (
    <div
      data-order-bar
      aria-hidden={!show}
      inert={!show}
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-card-lg backdrop-blur transition-transform duration-200 lg:hidden',
        show ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="flex flex-col">
          <span className="text-xs font-semibold text-text-muted">{label}</span>
          <span dir="ltr" className="text-[18px] leading-tight font-extrabold text-accent">
            {amount}
          </span>
        </p>
        <a href="#order-form" className={buttonClasses('primary', 'sm', 'px-7')}>
          {action}
        </a>
      </div>
    </div>
  );
}
