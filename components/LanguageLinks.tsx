import { locales, type Locale } from '@/i18n/locales';

const LABELS: Record<Locale, string> = { fr: 'FR', ar: 'ع', en: 'EN' };
const NAMES: Record<Locale, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

/**
 * Three-way language switch as plain links — zero client JS.
 * Each link names its language in that language (lang attribute set) so screen
 * readers pronounce it correctly.
 */
export function LanguageLinks({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1">
        {locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={`/${locale}`}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                aria-label={NAMES[locale]}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-surface-inverse text-text-on-inverse'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text'
                }`}
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
