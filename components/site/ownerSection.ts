import type { Locale } from '@/i18n/locales';

export type OwnerSection = 'stickers' | 'carBook';

/**
 * Which of the owner's two sections a path belongs to, or null on any other
 * page (the landing page, the FAQ…). `/fr/dashboard` is the stickers;
 * everything under `/fr/dashboard/car` is the car book.
 */
export function ownerSectionOf(pathname: string, locale: Locale): OwnerSection | null {
  const base = `/${locale}/dashboard`;
  const path = pathname.replace(/\/+$/, '');
  if (path === `${base}/car` || path.startsWith(`${base}/car/`)) return 'carBook';
  if (path === base) return 'stickers';
  return null;
}
