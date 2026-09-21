import { describe, expect, it } from 'vitest';
import { isPlaceholder, missingSiteDetails, publicSite, SITE } from '@/lib/config/site';

describe('site placeholders', () => {
  it('recognises a bracketed value as not filled in', () => {
    expect(isPlaceholder('[COMPANY NAME]')).toBe(true);
    expect(isPlaceholder(' [PHONE] ')).toBe(true);
    expect(isPlaceholder('AutoLink SARL')).toBe(false);
    // A real value that merely contains brackets is still real.
    expect(isPlaceholder('Bureau [B], Alger')).toBe(false);
    expect(isPlaceholder(null)).toBe(false);
    expect(isPlaceholder('')).toBe(false);
  });

  it('never hands a placeholder to a public page', () => {
    const site = publicSite();
    for (const value of [site.companyName, site.address, site.contactEmail, site.phone]) {
      expect(isPlaceholder(value)).toBe(false);
    }
    // With no real company name yet, the brand stands in.
    if (isPlaceholder(SITE.companyName)) expect(site.companyName).toBe(SITE.brand);
  });

  it('lists exactly what is still missing, for the admin', () => {
    const expected = (['companyName', 'address', 'contactEmail', 'phone'] as const).filter((key) =>
      isPlaceholder(SITE[key]),
    );
    expect(missingSiteDetails()).toEqual(expected);
  });
});
