'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/locales';
import { backFallback, showsBack } from './backTarget';
import { BackIcon } from './icons';

/** A real "back" changes the address at once; still unchanged after this, there was nowhere to go. */
const NOWHERE_AFTER_MS = 400;

/**
 * Opened from the Home Screen, the iPhone app has no Safari bar and so no back
 * button: this is it. Shown only there (`ios-app:` in globals.css), and not on
 * the app's own first screens. With no earlier page it goes to the page above.
 */
export function BackButton({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  if (!showsBack(pathname, locale)) return null;

  function goBack() {
    const fallback = backFallback(pathname, locale);
    if (window.history.length <= 1) {
      router.push(fallback);
      return;
    }
    const before = window.location.href;
    window.history.back();
    window.setTimeout(() => {
      if (window.location.href === before) router.push(fallback);
    }, NOWHERE_AFTER_MS);
  }

  return (
    <button
      type="button"
      data-back-button=""
      onClick={goBack}
      className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-accent-soft ios-app:inline-flex"
    >
      <BackIcon />
      <span className="sr-only">{label}</span>
    </button>
  );
}
