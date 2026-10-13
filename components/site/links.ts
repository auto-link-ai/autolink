import type { Locale } from '@/i18n/locales';

/** Public page paths (without the locale prefix), in navigation order. */
export const SITE_PAGES = ['', '/how-it-works', '/pricing', '/faq', '/contact', '/privacy', '/terms'] as const;
export type SitePage = (typeof SITE_PAGES)[number];

export function href(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

/**
 * Where the site's « order » buttons lead: in Arabic, the ad page (/offre),
 * which is in Arabic only; in French and English, the order page.
 */
export function orderHref(locale: Locale): string {
  return locale === 'ar' ? '/offre' : href(locale, '/order');
}
