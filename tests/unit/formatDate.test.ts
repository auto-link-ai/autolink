import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay } from '@/lib/format/date';

const day = new Date('2026-09-29T00:00:00.000Z');

describe('dates people read at a glance', () => {
  it('writes the month out in Arabic, with Western digits', () => {
    expect(formatDay(day, 'ar')).toBe('29 سبتمبر 2026');
    expect(formatDateTime(new Date('2026-09-29T12:00:00Z'), 'ar')).toContain('29 سبتمبر 2026');
  });

  it('keeps the short written month in French and English', () => {
    expect(formatDay(day, 'fr')).toBe('29 sept. 2026');
    expect(formatDay(day, 'en')).toBe('29 Sept 2026');
  });

  it('never shows the day before: calendar days are read in UTC', () => {
    expect(formatDay(new Date('2026-01-01T00:00:00.000Z'), 'ar')).toBe('1 جانفي 2026');
  });
});
