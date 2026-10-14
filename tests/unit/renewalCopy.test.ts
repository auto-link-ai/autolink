import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.json';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import { periodParts } from '@/lib/renewals/period';

const CATALOGUES = { fr, en, ar } as const;
const translator = (locale: keyof typeof CATALOGUES) => createTranslator({ locale, messages: CATALOGUES[locale] as typeof fr });

describe('common.period: a length of service, in words', () => {
  it.each([
    ['fr', 24, '2 ans'],
    ['fr', 12, '1 an'],
    ['fr', 18, '18 mois'],
    ['en', 24, '2 years'],
    ['en', 12, '1 year'],
    ['en', 6, '6 months'],
    ['ar', 12, 'سنة واحدة'],
    ['ar', 24, 'سنتين'],
    ['ar', 36, '3 سنوات'],
    ['ar', 6, '6 أشهر'],
  ] as const)('%s, %i months → %s', (locale, months, words) => {
    expect(translator(locale)('common.period', periodParts(months))).toBe(words);
  });
});

describe('every new message formats in every language', () => {
  it.each(['fr', 'en', 'ar'] as const)('%s', (locale) => {
    const t = translator(locale);
    const service = t('common.period', periodParts(24));
    const renewal = t('site.price.renewal', { price: '1 000 DA', period: t('common.period', periodParts(12)) });
    const texts = [
      t('site.pricing.oneTime', { service }),
      t('site.pricing.includes.renewal', { renewal }),
      t('site.faq.items.price.a', { price: '1 990 DA', service, renewal, period: '' }),
      t('site.faq.items.renewal.a', { renewal }),
      t('order.product.priceSuffix', { service }),
      t('dashboard.service.soonBody', { offer: renewal }),
      t('dashboard.service.expiredBody', { offer: renewal }),
      t('dashboard.service.pendingBody', { phone: '05 50 12 34 56', offer: renewal }),
      t('admin.renewals.confirmMessage', { tagId: 'AUT-7K3M9QXZ', period: t('common.period', periodParts(12)) }),
      t('notifications.renewal.whatsapp', { date: '12/11/2026', price: '1 000 DA', period: t('common.period', periodParts(12)) }),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/[{}]/);
      expect(text.length).toBeGreaterThan(5);
    }
    expect(texts[0]).toContain(service);
    expect(texts[1]).toContain('1 000 DA');
  });
});

describe('no page still promises "no subscription"', () => {
  it.each(['fr', 'en', 'ar'] as const)('%s', (locale) => {
    const catalogue = CATALOGUES[locale];
    expect(catalogue.site.pricing.includes).not.toHaveProperty('noSubscription');
    expect(catalogue.order.badges).not.toHaveProperty('noSubscription');
  });
});
