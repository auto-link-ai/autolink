import { describe, expect, it } from 'vitest';
import { whatsappLink } from '@/lib/site/whatsapp';

describe('the WhatsApp link', () => {
  it('turns every usual way of writing an Algerian mobile into the same link', () => {
    const want = 'https://wa.me/213550123456?text=Bonjour';
    for (const number of ['213550123456', '+213 550 12 34 56', '00213550123456', '0550 12 34 56']) {
      expect(whatsappLink(number, 'Bonjour')).toBe(want);
    }
  });

  it('carries the first message, encoded', () => {
    expect(whatsappLink('213550123456', 'سؤال حول AutoLink ?')).toBe(
      `https://wa.me/213550123456?text=${encodeURIComponent('سؤال حول AutoLink ?')}`,
    );
  });

  it('shows no button without a usable number', () => {
    expect(whatsappLink(null, 'x')).toBeNull();
    expect(whatsappLink('', 'x')).toBeNull();
    expect(whatsappLink('[WHATSAPP]', 'x')).toBeNull();
    expect(whatsappLink('12', 'x')).toBeNull();
  });
});
