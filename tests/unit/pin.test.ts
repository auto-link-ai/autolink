import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin, sameDigest, secretDigest, verifyPin } from '@/lib/security/pin';
import { isWeakPin, newPinProblem, normalizePin, pinSchema } from '@/lib/validation/pin';

beforeEach(() => vi.stubEnv('PIN_SECRET', 'a-test-secret-that-is-long-enough-1234'));
afterEach(() => vi.unstubAllEnvs());

describe('PIN shape', () => {
  it('takes 4 digits, Arabic-Indic ones and stray spaces included', () => {
    expect(pinSchema.parse('4071')).toBe('4071');
    expect(pinSchema.parse('٤٠٧١')).toBe('4071');
    expect(normalizePin(' 40 71 ')).toBe('4071');
  });

  it('refuses anything else with one code', () => {
    for (const bad of ['407', '40712', 'abcd', '', '40-7']) {
      expect(pinSchema.safeParse(bad).error?.issues[0]?.message).toBe('pin_format');
    }
  });
});

describe('easy-to-guess PINs', () => {
  it('refuses repeats, runs both ways and the classics', () => {
    for (const weak of ['0000', '7777', '1234', '6789', '7890', '4321', '0987', '1212', '2580', '6969']) {
      expect(isWeakPin(weak), weak).toBe(true);
    }
  });

  it('refuses the end of the owner’s own phone number', () => {
    expect(isWeakPin('4793', '0550 12 47 93')).toBe(true);
    expect(isWeakPin('4793', '0550 12 34 56')).toBe(false);
    expect(isWeakPin('8426', '0672008426')).toBe(true);
    expect(isWeakPin('8426', '٠٦٧٢٠٠٨٤٢٦')).toBe(true);
  });

  it('accepts an ordinary PIN', () => {
    expect(isWeakPin('4071', '0550123456')).toBe(false);
    expect(isWeakPin('9302')).toBe(false);
  });

  it('names the first problem with a PIN being chosen', () => {
    expect(newPinProblem('407', '407')).toBe('pin_format');
    expect(newPinProblem('1234', '1234')).toBe('pin_weak');
    expect(newPinProblem('4071', '4017')).toBe('pin_mismatch');
    expect(newPinProblem('٤٠٧١', '4071', '0550123456')).toBeNull();
  });
});

describe('PIN hashing', () => {
  it('verifies the right PIN only', async () => {
    const stored = await hashPin('4071');
    expect(stored).not.toContain('4071');
    await expect(verifyPin(stored, '4071')).resolves.toBe(true);
    await expect(verifyPin(stored, '4072')).resolves.toBe(false);
    await expect(verifyPin('not-a-hash', '4071')).resolves.toBe(false);
  });

  it('depends on PIN_SECRET: a leaked hash is useless without it', async () => {
    const stored = await hashPin('4071');
    vi.stubEnv('PIN_SECRET', 'another-secret-that-is-long-enough-5678');
    await expect(verifyPin(stored, '4071')).resolves.toBe(false);
  });

  it('refuses to run without a real secret', () => {
    vi.stubEnv('PIN_SECRET', 'short');
    expect(() => secretDigest('pin', '4071')).toThrow(/PIN_SECRET/);
  });

  it('keeps PIN and code digests apart, and compares them in constant time', () => {
    expect(secretDigest('pin', '123456')).not.toBe(secretDigest('code', '123456'));
    const digest = secretDigest('code', 'CHL-1:123456');
    expect(sameDigest(digest, secretDigest('code', 'CHL-1:123456'))).toBe(true);
    expect(sameDigest(digest, secretDigest('code', 'CHL-1:123457'))).toBe(false);
    expect(sameDigest('', '')).toBe(false);
  });
});
