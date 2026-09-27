import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { withoutPhoneLanguage } from '@/i18n/firstVisit';

describe('withoutPhoneLanguage', () => {
  it("drops the phone's language, so a French phone still opens in Arabic", () => {
    const request = new NextRequest('https://www.qauto.store/', { headers: { 'accept-language': 'fr-DZ,fr;q=0.9' } });
    expect(withoutPhoneLanguage(request).headers.get('accept-language')).toBeNull();
  });

  it('keeps the language the visitor chose before, and everything else', () => {
    const request = new NextRequest('https://www.qauto.store/faq', {
      headers: { 'accept-language': 'en', cookie: 'NEXT_LOCALE=fr', 'user-agent': 'test' },
    });
    const kept = withoutPhoneLanguage(request);
    expect(kept.cookies.get('NEXT_LOCALE')?.value).toBe('fr');
    expect(kept.headers.get('user-agent')).toBe('test');
    expect(kept.nextUrl.pathname).toBe('/faq');
  });
});
