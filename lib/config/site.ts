/**
 * Company and contact details shown on the public site (footer, /contact,
 * /privacy, /terms, emails).
 *
 * PLACEHOLDERS — replace every bracketed value before launch. They are kept in
 * this one file so nothing else needs editing. Leave a value as `null` to hide
 * that contact channel entirely.
 */
export const SITE = {
  brand: 'AutoLink',
  companyName: '[COMPANY NAME]',
  address: '[ADDRESS]',
  contactEmail: '[CONTACT EMAIL]' as string | null,
  /** Displayed as written, e.g. '0550 00 00 00'. */
  phone: '[PHONE]' as string | null,
  /** International digits only for the wa.me link, e.g. '213550000000'. */
  whatsapp: null as string | null,
  /** Customer service hours, one line per locale. */
  hours: {
    fr: 'Du dimanche au jeudi, 9h – 17h',
    ar: 'من الأحد إلى الخميس، 9:00 – 17:00',
    en: 'Sunday to Thursday, 9:00 – 17:00',
  },
} as const;

/** True while any placeholder is still in place (shown as a banner in the admin). */
export function sitePlaceholdersRemain(): boolean {
  return [SITE.companyName, SITE.address, SITE.contactEmail, SITE.phone].some(
    (value) => typeof value === 'string' && value.startsWith('['),
  );
}
