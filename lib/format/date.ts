import type { Locale } from '@/i18n/locales';

// Western numerals in every locale (spec §2.2), Algerian time.
const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-DZ',
  ar: 'ar-DZ-u-nu-latn',
  en: 'en-GB',
};

/**
 * How a date is written. Arabic's medium style is all digits (« 2026/09/29 »),
 * hard to read at a glance: it writes the month out (« 29 سبتمبر 2026 »).
 * French and English already do in their medium style (« 29 sept. 2026 »).
 */
const DATE_STYLE: Record<Locale, 'long' | 'medium'> = { ar: 'long', fr: 'medium', en: 'medium' };

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: DATE_STYLE[locale],
    timeStyle: 'short',
    timeZone: 'Africa/Algiers',
  }).format(date);
}

/**
 * A calendar day stored as UTC midnight (car book due dates): formatted in UTC
 * so it never shows as the day before anywhere.
 */
export function formatDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: DATE_STYLE[locale], timeZone: 'UTC' }).format(date);
}

const MINUTE = 60_000;
const UNITS: readonly [limit: number, size: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60 * MINUTE, MINUTE, 'minute'],
  [24 * 60 * MINUTE, 60 * MINUTE, 'hour'],
  [30 * 24 * 60 * MINUTE, 24 * 60 * MINUTE, 'day'],
  [Number.POSITIVE_INFINITY, 30 * 24 * 60 * MINUTE, 'month'],
];

/**
 * "2 hours ago" — how old something is, for the admin's queue where the age of
 * an order matters more than its date. Rounds down to the largest unit that fits.
 */
export function formatAge(date: Date, locale: Locale, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  const [, size, unit] = UNITS.find(([limit]) => elapsed < limit) ?? UNITS[UNITS.length - 1]!;
  const format = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
  return format.format(-Math.floor(elapsed / size), unit);
}

/** The same day with the month written out — « 12 mai 2026 », « 12 ماي 2026 » — where there is room. */
export function formatDayLong(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}
