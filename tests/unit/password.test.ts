import { describe, expect, it } from 'vitest';
import { generateReadablePassword, hashSecret, verifySecret } from '@/lib/security/password';

describe('generateReadablePassword', () => {
  it('is 4 groups of 5 Crockford characters (no I, L, O, U)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateReadablePassword()).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
    }
  });

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 1000 }, generateReadablePassword)).size).toBe(1000);
  });

  it('round-trips through argon2id', async () => {
    const password = generateReadablePassword();
    const stored = await hashSecret(password);
    expect(stored.startsWith('$argon2id$')).toBe(true);
    expect(await verifySecret(stored, password)).toBe(true);
    expect(await verifySecret(stored, password.toLowerCase())).toBe(false);
  });
});
