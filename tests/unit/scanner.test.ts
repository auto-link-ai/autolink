import { describe, expect, it } from 'vitest';
import { scannerLocale } from '@/lib/scanner/locale';
import { messageSchema } from '@/lib/validation/message';
import { STORAGE_LIMITS } from '@/lib/domain/constants';

describe('scannerLocale', () => {
  it('opens in Arabic until the person chooses another language', () => {
    expect(scannerLocale(null)).toBe('ar');
    expect(scannerLocale(undefined)).toBe('ar');
  });

  it('keeps the language chosen with the switcher on the page', () => {
    expect(scannerLocale('fr')).toBe('fr');
    expect(scannerLocale('en')).toBe('en');
    expect(scannerLocale('ar')).toBe('ar');
  });

  it('ignores an unknown choice rather than trusting it', () => {
    expect(scannerLocale('de')).toBe('ar');
    expect(scannerLocale('!!! garbage ;;;')).toBe('ar');
  });
});

describe('messageSchema', () => {
  const schema = messageSchema(400);
  const valid = { category: 'LIGHTS_ON', body: 'Your lights are on, level -2.', scannerContact: '' };

  it('accepts a normal report and treats no contact as none', () => {
    const parsed = schema.parse(valid);
    expect(parsed.category).toBe('LIGHTS_ON');
    expect(parsed.scannerContact).toBeNull();
  });

  it('keeps a contact the sender chose to leave', () => {
    expect(schema.parse({ ...valid, scannerContact: ' 0551 23 45 67 ' }).scannerContact).toBe('0551 23 45 67');
  });

  it('refuses an unknown category — the list is fixed', () => {
    const result = schema.safeParse({ ...valid, category: 'HACKED' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('invalid_category');
  });

  it('accepts a report with no words at all — the category says it', () => {
    const parsed = schema.parse({ ...valid, body: '   ' });
    expect(parsed.body).toBe('');
  });

  it('refuses a body longer than the setting allows', () => {
    const result = schema.safeParse({ ...valid, body: 'x'.repeat(401) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('too_long');
  });

  it('never lets a setting raise the limit above what the schema stores', () => {
    const generous = messageSchema(STORAGE_LIMITS.messageBody + 5_000);
    expect(generous.safeParse({ ...valid, body: 'x'.repeat(STORAGE_LIMITS.messageBody + 1) }).success).toBe(false);
    expect(generous.safeParse({ ...valid, body: 'x'.repeat(STORAGE_LIMITS.messageBody) }).success).toBe(true);
  });

  it('caps the contact so a novel cannot be stuffed into it', () => {
    expect(schema.safeParse({ ...valid, scannerContact: 'x'.repeat(STORAGE_LIMITS.scannerContact + 1) }).success).toBe(
      false,
    );
  });
});
