import { describe, expect, it } from 'vitest';
import { carDescribed, carLabel, carName } from '@/lib/vehicles/carName';

describe('naming a car that may not be described yet', () => {
  it('names a described car', () => {
    const car = { brand: 'Peugeot', model: '3008', color: 'Gris' };
    expect(carName(car)).toBe('Peugeot 3008');
    expect(carLabel(car)).toBe('Peugeot 3008 · Gris');
    expect(carDescribed(car)).toBe(true);
  });

  it('has no name for a car linked but not described, so callers say « Votre voiture »', () => {
    const car = { brand: '', model: '', color: '' };
    expect(carName(car)).toBeNull();
    expect(carLabel(car)).toBeNull();
    expect(carDescribed(car)).toBe(false);
  });

  it('uses what there is, without a dangling separator', () => {
    expect(carLabel({ brand: 'Dacia', model: 'Logan', color: ' ' })).toBe('Dacia Logan');
    expect(carName({ brand: 'Renault', model: '' })).toBe('Renault');
    expect(carDescribed({ brand: 'Renault', model: '', color: 'Blanc' })).toBe(false);
  });
});
