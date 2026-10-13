import { describe, expect, it } from 'vitest';
import { formatPhone, maskPhone } from '@/lib/format/phone';
import { CAR_BRANDS, modelsFor } from '@/lib/vehicles/brands';

describe('phone display', () => {
  it('groups a mobile in pairs, as people say it', () => {
    expect(formatPhone('0550123456')).toBe('05 50 12 34 56');
    expect(formatPhone('not a number')).toBe('not a number');
  });

  it('masks the middle on the code screen', () => {
    expect(maskPhone('0550123456')).toBe('05 •• •• 34 56');
    expect(maskPhone('')).toBe('••');
  });
});

describe('car brands', () => {
  it('lists each make once, with models to suggest', () => {
    const names = CAR_BRANDS.map((brand) => brand.name);
    expect(new Set(names).size).toBe(names.length);
    expect(CAR_BRANDS.every((brand) => brand.models.length > 0)).toBe(true);
  });

  it('suggests the models of the make chosen, none otherwise', () => {
    expect(modelsFor('Renault')).toContain('Symbol');
    expect(modelsFor('other')).toEqual([]);
  });
});
