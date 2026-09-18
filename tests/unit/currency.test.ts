import { describe, expect, it } from 'vitest';
import { formatDzd } from '@/lib/format/currency';

// Output uses non-breaking spaces; compare against a readable form.
const readable = (s: string) => s.replace(/ /g, ' ');

describe('formatDzd', () => {
  it.each([
    [1500, '1 500 DA'],
    [0, '0 DA'],
    [999, '999 DA'],
    [1000, '1 000 DA'],
    [1234567, '1 234 567 DA'],
    [1499.6, '1 500 DA'],
    [-2500, '-2 500 DA'],
  ])('%d → %s', (amount, expected) => {
    expect(readable(formatDzd(amount))).toBe(expected);
  });

  it('uses the label from settings', () => {
    expect(readable(formatDzd(1500, 'DZD'))).toBe('1 500 DZD');
  });

  it('uses non-breaking spaces so amounts never wrap', () => {
    expect(formatDzd(1500)).toBe('1 500 DA');
  });

  it('rejects non-finite input', () => {
    expect(() => formatDzd(Number.NaN)).toThrow(RangeError);
  });
});
