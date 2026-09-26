import { describe, expect, it } from 'vitest';
import { ownerSectionOf } from '@/components/site/ownerSection';
import { addDays, countDueSoon, type DueInputs } from '@/lib/care/due';

describe('ownerSectionOf', () => {
  it('lights the stickers on the dashboard, in every language', () => {
    expect(ownerSectionOf('/fr/dashboard', 'fr')).toBe('stickers');
    expect(ownerSectionOf('/ar/dashboard', 'ar')).toBe('stickers');
    expect(ownerSectionOf('/en/dashboard/', 'en')).toBe('stickers');
  });

  it('lights the car book on the chooser, a book and any of its sections', () => {
    expect(ownerSectionOf('/fr/dashboard/car', 'fr')).toBe('carBook');
    expect(ownerSectionOf('/fr/dashboard/car/AUT-7K3M9QX2', 'fr')).toBe('carBook');
    expect(ownerSectionOf('/ar/dashboard/car/AUT-7K3M9QX2/oil', 'ar')).toBe('carBook');
  });

  it('lights nothing on the public pages', () => {
    for (const path of ['/fr', '/fr/faq', '/fr/order', '/fr/activate', '/t/AUT-7K3M9QX2']) {
      expect(ownerSectionOf(path, 'fr')).toBeNull();
    }
  });

  it('is not fooled by look-alike paths or another language', () => {
    expect(ownerSectionOf('/fr/dashboard-old', 'fr')).toBeNull();
    expect(ownerSectionOf('/fr/dashboard/cars', 'fr')).toBeNull();
    expect(ownerSectionOf('/en/dashboard', 'fr')).toBeNull();
  });
});

describe('countDueSoon', () => {
  const today = new Date('2026-09-21T00:00:00.000Z');
  const car = (patch: Partial<DueInputs>): DueInputs => ({
    oilChange: null,
    insuranceExpiry: null,
    inspectionDue: null,
    vignetteDue: null,
    ...patch,
  });

  it('counts what is late or due soon, across every car', () => {
    const cars = [
      car({ insuranceExpiry: addDays(today, 3), vignetteDue: addDays(today, 200) }),
      car({ inspectionDue: addDays(today, 7), oilChange: { date: addDays(today, 1), km: null } }),
    ];
    expect(countDueSoon(cars, today, 7)).toEqual({ count: 3, late: false });
  });

  it('says when one of them has already passed', () => {
    expect(countDueSoon([car({ vignetteDue: addDays(today, -1) })], today, 7)).toEqual({ count: 1, late: true });
  });

  it('leaves out dates far off, an oil change known only by km, and empty books', () => {
    const cars = [car({ insuranceExpiry: addDays(today, 30) }), car({ oilChange: { date: null, km: 150000 } }), car({})];
    expect(countDueSoon(cars, today, 7)).toEqual({ count: 0, late: false });
    expect(countDueSoon([], today, 7)).toEqual({ count: 0, late: false });
  });
});
