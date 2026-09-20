import { describe, expect, it } from 'vitest';
import { fieldErrors, loginSchema, registerSchema, PASSWORD_MIN_LENGTH } from '@/lib/validation/auth';
import { vehicleSchema } from '@/lib/validation/vehicle';

const account = {
  name: 'Amine  Belkacem ',
  email: '  Amine@Example.DZ ',
  phone: '0551 23 45 67',
  password: 'a-long-enough-password',
  locale: 'fr',
};

describe('registerSchema', () => {
  it('normalizes the name, email and phone', () => {
    const parsed = registerSchema.parse(account);
    expect(parsed.name).toBe('Amine Belkacem');
    expect(parsed.email).toBe('amine@example.dz');
    expect(parsed.phone).toBe('0551234567');
  });

  it('treats an empty phone as "not given"', () => {
    expect(registerSchema.parse({ ...account, phone: '' }).phone).toBeNull();
  });

  it('rejects a short password, and accepts one exactly at the minimum', () => {
    const short = registerSchema.safeParse({ ...account, password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1) });
    expect(short.success).toBe(false);
    if (!short.success) expect(fieldErrors(short.error).password).toBe('password_too_short');
    expect(registerSchema.safeParse({ ...account, password: 'x'.repeat(PASSWORD_MIN_LENGTH) }).success).toBe(true);
  });

  it.each([
    ['email', 'not-an-email', 'invalid_email'],
    ['phone', '0100000000', 'invalid_phone'],
    ['name', 'A', 'too_short'],
  ])('rejects a bad %s', (field, value, code) => {
    const result = registerSchema.safeParse({ ...account, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)[field]).toBe(code);
  });

  it('falls back to French rather than failing on an unknown locale', () => {
    expect(registerSchema.parse({ ...account, locale: 'de' }).locale).toBe('fr');
  });
});

describe('loginSchema', () => {
  it('matches the address however it was typed at registration', () => {
    expect(loginSchema.parse({ email: ' AMINE@example.dz ', password: 'x' }).email).toBe('amine@example.dz');
  });

  it('requires a password but never judges its length', () => {
    expect(loginSchema.safeParse({ email: 'a@b.dz', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.dz', password: 'old' }).success).toBe(true);
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
});
