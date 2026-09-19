import { describe, expect, it } from 'vitest';
import {
  activationCodeInputSchema,
  formatActivationCode,
  isValidActivationCodeShape,
  normalizeActivationCodeInput,
} from '@/lib/validation/activationCode';

describe('activation codes', () => {
  it('formats 10 raw characters', () => {
    expect(formatActivationCode('ABCDEFGHJK')).toBe('ABCD-EFGH-JK');
    expect(() => formatActivationCode('ABCDEFGHJ')).toThrow(RangeError);
    expect(() => formatActivationCode('ABCDEFGHJU')).toThrow(RangeError);
  });

  it('strict shape', () => {
    expect(isValidActivationCodeShape('ABCD-EFGH-JK')).toBe(true);
    expect(isValidActivationCodeShape('abcd-efgh-jk')).toBe(false);
    expect(isValidActivationCodeShape('ABCDEFGHJK')).toBe(false);
  });

  it.each([
    ['ABCD-EFGH-JK', 'ABCD-EFGH-JK'],
    ['abcd efgh jk', 'ABCD-EFGH-JK'],
    ['ABCDEFGHJK', 'ABCD-EFGH-JK'],
    ['0OIL-1234-56', '0011-1234-56'],
    ['١٢٣٤-٥٦٧٨-٩٠', '1234-5678-90'],
  ])('normalizes %j → %s', (input, expected) => {
    expect(normalizeActivationCodeInput(input)).toBe(expected);
  });

  it.each(['', 'ABCD-EFGH-J', 'ABCD-EFGH-JKM', 'ABCD-EFGH-JU'])('rejects %j', (input) => {
    expect(normalizeActivationCodeInput(input)).toBeNull();
  });

  it('schema normalizes and fails with a stable code', () => {
    expect(activationCodeInputSchema.parse(' abcdefghjk ')).toBe('ABCD-EFGH-JK');
    expect(activationCodeInputSchema.safeParse('nope').error?.issues[0]?.message).toBe('invalid_activation_code');
  });
});
