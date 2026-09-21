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

/** A value still set to its `[PLACEHOLDER]` is treated as not set at all. */
export function isPlaceholder(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\[.*\]$/.test(value.trim());
}

function filled(value: string | null): string | null {
  return value && !isPlaceholder(value) ? value : null;
}

/**
 * What customers may see. A placeholder never reaches a public page: a missing
 * channel is simply not shown, and a missing company name reads "AutoLink" —
 * rather than "© 2026 [COMPANY NAME]" in every footer.
 */
export function publicSite() {
  return {
    companyName: filled(SITE.companyName) ?? SITE.brand,
    address: filled(SITE.address),
    contactEmail: filled(SITE.contactEmail),
    phone: filled(SITE.phone),
    whatsapp: SITE.whatsapp,
  };
}

/** Which details are still placeholders — listed for the admin, never shown publicly. */
export function missingSiteDetails(): Array<'companyName' | 'address' | 'contactEmail' | 'phone'> {
  return (['companyName', 'address', 'contactEmail', 'phone'] as const).filter((key) => isPlaceholder(SITE[key]));
}

/** True while any placeholder is still in place (shown as a banner in the admin). */
export function sitePlaceholdersRemain(): boolean {
  return missingSiteDetails().length > 0;
}
