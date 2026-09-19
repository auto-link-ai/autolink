import type { Locale } from '@/i18n/locales';

// Western numerals in every locale (spec §2.2), Algerian time.
const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-DZ',
  ar: 'ar-DZ-u-nu-latn',
  en: 'en-GB',
};

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Algiers',
  }).format(date);
}
