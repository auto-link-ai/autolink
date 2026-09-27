import type { Locale } from '@/i18n/locales';

/** The admin's sections, in the order the navigation shows them. */
export const ADMIN_SECTIONS = ['overview', 'orders', 'tags', 'customers', 'blocked', 'settings'] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export function adminSectionHref(locale: Locale, section: AdminSection): string {
  return section === 'overview' ? `/${locale}/admin` : `/${locale}/admin/${section}`;
}

/**
 * Which section a path belongs to: /fr/admin → overview, /fr/admin/tags/… → tags.
 * A path outside the admin matches nothing — "no match" and "the admin root"
 * must not collapse into the same answer.
 */
export function currentAdminSection(pathname: string): AdminSection | undefined {
  const match = /^\/[a-z]{2}\/admin(?:\/(.*))?$/i.exec(pathname);
  if (!match) return undefined;
  const rest = match[1] ?? '';
  if (rest === '') return 'overview';
  return ADMIN_SECTIONS.find((section) => section !== 'overview' && rest.startsWith(section));
}
