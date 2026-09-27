import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';

/**
 * `/t/[tagId]` carries no locale prefix — the printed QR has to stay short —
 * so the page picks the language itself: the choice made with the switcher on
 * the page (remembered in a cookie), otherwise Arabic. The phone's own language
 * does not decide, as on the rest of the site.
 */
export function scannerLocale(chosen?: string | null): Locale {
  return isLocale(chosen) ? chosen : defaultLocale;
}
