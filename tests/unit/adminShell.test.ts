import { describe, expect, it } from 'vitest';
import { currentAdminSection } from '@/lib/admin/sections';
import { formatAge } from '@/lib/format/date';

describe('currentAdminSection', () => {
  it.each([
    ['/fr/admin', 'overview'],
    ['/fr/admin/', 'overview'],
    ['/en/admin/orders', 'orders'],
    ['/ar/admin/tags', 'tags'],
    // A detail panel or a filter is still the same section.
    ['/fr/admin/customers?id=USR-7K3M9QXZ', 'customers'],
    ['/fr/admin/settings', 'settings'],
  ])('%s → %s', (pathname, section) => {
    expect(currentAdminSection(pathname)).toBe(section);
  });

  it('marks nothing outside the admin', () => {
    expect(currentAdminSection('/fr/dashboard')).toBeUndefined();
    expect(currentAdminSection('/fr/admin-ish')).toBeUndefined();
    expect(currentAdminSection('/')).toBeUndefined();
  });
});

describe('formatAge', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MINUTE = 60_000;

  it('picks the largest unit that fits', () => {
    expect(formatAge(ago(5 * MINUTE), 'en', now)).toBe('5 minutes ago');
    expect(formatAge(ago(3 * 60 * MINUTE), 'en', now)).toBe('3 hours ago');
    expect(formatAge(ago(2 * 24 * 60 * MINUTE), 'en', now)).toBe('2 days ago');
    expect(formatAge(ago(70 * 24 * 60 * MINUTE), 'en', now)).toBe('2 months ago');
  });

  it('never reads as being in the future when clocks disagree', () => {
    expect(formatAge(new Date(now.getTime() + 60_000), 'en', now)).toBe('this minute');
  });

  it('speaks French and Arabic too', () => {
    expect(formatAge(ago(2 * 60 * MINUTE), 'fr', now)).toContain('2');
    // Arabic says "قبل ساعتين" — the dual form, with no numeral at all. When it
    // does use one it must be Western (spec §2.2), never Arabic-Indic.
    const arabic = formatAge(ago(5 * 60 * MINUTE), 'ar', now);
    expect(arabic).toMatch(/5/);
    expect(arabic).not.toMatch(/[٠-٩]/);
  });
});
