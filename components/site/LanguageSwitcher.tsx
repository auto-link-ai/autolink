'use client';

import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';

const LABELS: Record<Locale, string> = { fr: 'FR', ar: 'ع', en: 'EN' };
const NAMES: Record<Locale, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
const LOCALE_PREFIX = new RegExp(`^/(${locales.join('|')})(?=/|$)`);

/**
 * Three-way language switch that keeps the current page (/en/pricing →
 * /fr/pricing). Plain links: switching language reloads the page so <html>
 * gets the new lang and dir. Each link names its language in that language.
 */
export function LanguageSwitcher({ current, label, className }: { current: Locale; label: string; className?: string }) {
  const rest = (usePathname() ?? '').replace(LOCALE_PREFIX, '');

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-0.5 rounded-full bg-surface-3 p-1">
        {locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={`/${locale}${rest}`}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                aria-label={NAMES[locale]}
                className={cx(
                  'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-[13px] font-bold transition-colors',
                  active ? 'bg-white text-accent shadow-card-sm' : 'text-text-muted hover:text-text',
                )}
              >
                {LABELS[locale]}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
