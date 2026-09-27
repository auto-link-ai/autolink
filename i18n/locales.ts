/**
 * Locale constants. Plain data with no next-intl import, so models, validation
 * and scripts can use them without pulling in the i18n runtime.
 */
// Arabic first: it is the default, and the switcher lists the languages in this order.
export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ar';

const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar']);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** For untrusted input (e.g. a hidden form field): falls back to the default locale. */
export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
