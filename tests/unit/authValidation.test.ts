import { describe, expect, it } from 'vitest';
import { activationDetailsSchema, carSchema, chosenBrand, OTHER_BRAND } from '@/lib/validation/activation';
import { customerContactSchema, fieldErrors, pinLoginSchema, requiredPhoneSchema } from '@/lib/validation/auth';
import { vehicleSchema } from '@/lib/validation/vehicle';

const details = {
  firstName: ' Amine ',
  lastName: 'Belkacem  Ould ',
  phone: '0551 23 45 67',
  brand: 'Renault',
  model: ' Symbol ',
};

describe('activationDetailsSchema', () => {
  it('tidies names and the car, and normalizes the phone', () => {
    expect(activationDetailsSchema.parse(details)).toEqual({
      firstName: 'Amine',
      lastName: 'Belkacem Ould',
      phone: '0551234567',
      brand: 'Renault',
      model: 'Symbol',
    });
  });

  it.each([
    ['phone', '', 'required'],
    ['phone', '0100000000', 'invalid_phone'],
    ['firstName', 'A', 'too_short'],
    ['lastName', 'x'.repeat(41), 'too_long'],
    ['brand', '', 'required'],
    ['model', '   ', 'required'],
  ])('reports a bad %s as « %s » → %s', (field, value, code) => {
    const result = activationDetailsSchema.safeParse({ ...details, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors<string>(result.error)[field]).toBe(code);
  });

  it('takes the brand typed under « Autre » when it is not on the list', () => {
    expect(chosenBrand('Renault', 'ignored')).toBe('Renault');
    expect(chosenBrand(OTHER_BRAND, 'Lada')).toBe('Lada');
    expect(chosenBrand(null, null)).toBe('');
    expect(carSchema.safeParse({ brand: chosenBrand(OTHER_BRAND, ''), model: 'Niva' }).success).toBe(false);
  });
});

describe('pinLoginSchema', () => {
  it('normalizes the number and the PIN, Arabic digits included', () => {
    expect(pinLoginSchema.parse({ phone: '+213 551 23 45 67', pin: '٤٠٧١' })).toEqual({ phone: '0551234567', pin: '4071' });
  });

  it('says what is wrong with each part', () => {
    const result = pinLoginSchema.safeParse({ phone: '12', pin: '12' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toEqual({ phone: 'invalid_phone', pin: 'pin_format' });
  });
});

describe('requiredPhoneSchema', () => {
  it('requires a number: empty is « required », not « invalid »', () => {
    expect(requiredPhoneSchema.safeParse('   ').error?.issues[0]?.message).toBe('required');
    expect(requiredPhoneSchema.safeParse('0450123456').error?.issues[0]?.message).toBe('invalid_phone');
    expect(requiredPhoneSchema.parse('07 70 12 34 56')).toBe('0770123456');
  });
});

describe('customerContactSchema', () => {
  it('is what support may correct: names and the number', () => {
    expect(customerContactSchema.parse({ firstName: 'Sara', lastName: 'Haddad', phone: '0661 00 11 22' })).toEqual({
      firstName: 'Sara',
      lastName: 'Haddad',
      phone: '0661001122',
    });
    expect(customerContactSchema.safeParse({ firstName: 'Sara', lastName: 'Haddad', phone: '' }).success).toBe(false);
  });
});

describe('vehicleSchema', () => {
  it('tidies the details and upper-cases the plate', () => {
    const parsed = vehicleSchema.parse({
      brand: ' Peugeot ',
      model: '208  GT',
      color: 'Bleu',
      plateNumber: ' 12345-116-16 ',
      showDetailsPublicly: 'on',
    });
    expect(parsed).toEqual({
      brand: 'Peugeot',
      model: '208 GT',
      color: 'Bleu',
      plateNumber: '12345-116-16',
      showDetailsPublicly: true,
    });
  });

  it('defaults the public toggle to off when the checkbox is unchecked', () => {
    const parsed = vehicleSchema.parse({ brand: 'Renault', model: 'Clio', color: 'Noir', plateNumber: '' });
    expect(parsed.showDetailsPublicly).toBe(false);
    expect(parsed.plateNumber).toBeNull();
  });

  it('accepts no colour — activation does not ask for one — but not a one-letter one', () => {
    expect(vehicleSchema.parse({ brand: 'Renault', model: 'Clio', color: '  ', plateNumber: '' }).color).toBe('');
    expect(vehicleSchema.safeParse({ brand: 'Renault', model: 'Clio', color: 'B', plateNumber: '' }).success).toBe(false);
  });
});
