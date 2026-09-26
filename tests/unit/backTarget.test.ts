import { describe, expect, it } from 'vitest';
import { backFallback, showsBack } from '@/components/site/backTarget';

describe('showsBack', () => {
  it("hides on the app's own first screens, in every language", () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
      expect(showsBack(`/${locale}`, locale)).toBe(false);
      expect(showsBack(`/${locale}/dashboard`, locale)).toBe(false);
      expect(showsBack(`/${locale}/dashboard/car/`, locale)).toBe(false);
    }
  });

  it('shows everywhere else', () => {
    for (const path of ['/fr/faq', '/fr/order', '/fr/order/AL-7K3M9Q', '/fr/dashboard/car/AUT-7K3M9QX2', '/fr/dashboard/car/AUT-7K3M9QX2/oil', '/fr/login']) {
      expect(showsBack(path, 'fr')).toBe(true);
    }
  });

  it('is not fooled by look-alike paths', () => {
    expect(showsBack('/fr/dashboard-old', 'fr')).toBe(true);
    expect(showsBack('/fr/dashboards', 'fr')).toBe(true);
  });
});

describe('backFallback', () => {
  it("goes from a car book section to that car's book", () => {
    expect(backFallback('/fr/dashboard/car/AUT-7K3M9QX2/oil', 'fr')).toBe('/fr/dashboard/car/AUT-7K3M9QX2');
    expect(backFallback('/ar/dashboard/car/AUT-7K3M9QX2/notes/', 'ar')).toBe('/ar/dashboard/car/AUT-7K3M9QX2');
  });

  it("goes from a car's book to the stickers, never to /dashboard/car (which comes straight back)", () => {
    expect(backFallback('/fr/dashboard/car/AUT-7K3M9QX2', 'fr')).toBe('/fr/dashboard');
    expect(backFallback('/en/dashboard/car', 'en')).toBe('/en/dashboard');
  });

  it('goes from a public page to the home page', () => {
    expect(backFallback('/fr/faq', 'fr')).toBe('/fr');
    expect(backFallback('/ar/order/AL-7K3M9Q', 'ar')).toBe('/ar');
    expect(backFallback('/fr/dashboard-old', 'fr')).toBe('/fr');
  });
});
