import { describe, expect, it } from 'vitest';
import { dzPhoneSchema, findDzPhone, isValidDzPhone, normalizeDzPhone } from '@/lib/validation/phone';

describe('normalizeDzPhone', () => {
  it.each([
    ['0551234567', '0551234567'],
    ['0661234567', '0661234567'],
    ['0771234567', '0771234567'],
    ['+213551234567', '0551234567'],
    ['00213661234567', '0661234567'],
    ['+213 0771234567', '0771234567'],
    ['+213 (5) 51-23-45-67', '0551234567'],
    ['0661 23 45 67', '0661234567'],
    ['06.61.23.45.67', '0661234567'],
    ['٠٦٦١٢٣٤٥٦٧', '0661234567'],
  ])('accepts %s → %s', (input, expected) => {
    expect(normalizeDzPhone(input)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['0212345678', 'landline prefix 02'],
    ['0851234567', 'invalid prefix 08'],
    ['055123456', 'too short'],
    ['05512345678', 'too long'],
    ['551234567', 'missing trunk 0 without country code'],
    ['+33551234567', 'foreign country code'],
    ['05512a4567', 'letters'],
    ['213551234567', 'country code without + or 00'],
  ])('rejects %s (%s)', (input) => {
    expect(normalizeDzPhone(input)).toBeNull();
    expect(isValidDzPhone(input)).toBe(false);
  });
});

describe('dzPhoneSchema', () => {
  it('outputs the normalized form', () => {
    expect(dzPhoneSchema.parse('+213 661 23 45 67')).toBe('0661234567');
  });

  it('fails with a stable error code', () => {
    const result = dzPhoneSchema.safeParse('12345');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('invalid_phone');
  });
});

describe('findDzPhone', () => {
  it('finds the number a scanner left, alone or inside a sentence', () => {
    expect(findDzPhone('0550 12 34 56')).toBe('0550123456');
    expect(findDzPhone('Karim, 0661-00-11-22, merci')).toBe('0661001122');
    expect(findDzPhone('+213 7 70 12 34 56')).toBe('0770123456');
    expect(findDzPhone('اتصل ٠٥٥٠١٢٣٤٥٦')).toBe('0550123456');
  });

  it('answers null when there is no mobile to call back', () => {
    expect(findDzPhone('karim@example.dz')).toBeNull();
    expect(findDzPhone('021 12 34 56')).toBeNull();
    expect(findDzPhone('')).toBeNull();
  });
});
