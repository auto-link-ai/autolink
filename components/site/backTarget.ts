import type { Locale } from '@/i18n/locales';

function clean(pathname: string): string {
  return pathname.replace(/\/+$/, '');
}

/**
 * The app's own first screens — the landing page and the owner's two tabs —
 * have no back arrow, like the first screen of a tab in an iPhone app.
 */
export function showsBack(pathname: string, locale: Locale): boolean {
  const home = `/${locale}`;
  return ![home, `${home}/dashboard`, `${home}/dashboard/car`].includes(clean(pathname));
}

/**
 * Where back goes when there is no earlier page (the app opened straight onto
 * this one, from a notification): the page above. A car book section goes to
 * that car's book; any other owner page to the stickers — not to
 * /dashboard/car, which would send a one-car owner straight back here.
 */
export function backFallback(pathname: string, locale: Locale): string {
  const path = clean(pathname);
  const dashboard = `/${locale}/dashboard`;
  const book = `${dashboard}/car/`;
  if (path.startsWith(book)) {
    const [tagId, section] = path.slice(book.length).split('/');
    if (tagId && section) return `${book}${tagId}`;
  }
  if (path === dashboard || path.startsWith(`${dashboard}/`)) return dashboard;
  return `/${locale}`;
}
