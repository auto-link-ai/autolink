import { describe, expect, it } from 'vitest';
import {
  allowsMore,
  clampQuantity,
  FIELD_ORDER,
  firstFieldToFix,
  quantityCards,
  TUCKED_AWAY,
} from '@/app/[locale]/(site)/order/orderFieldOrder';
import { orderInputSchema, shortOrderInputSchema } from '@/lib/validation/order';

describe('the one-page order form', () => {
  it('shows every field of the order, each once', () => {
    const wanted = Object.keys(orderInputSchema(10).shape).sort();
    expect([...FIELD_ORDER].sort()).toEqual(wanted);
    expect(new Set(FIELD_ORDER).size).toBe(FIELD_ORDER.length);
  });

  it('sends the cursor to the first field to fix, top to bottom', () => {
    expect(firstFieldToFix({ address: 'too_short', phone: 'invalid_phone' })).toBe('phone');
    expect(firstFieldToFix({ email: 'invalid_email', commune: 'too_short' })).toBe('commune');
    expect(firstFieldToFix({ website: 'invalid' })).toBeNull();
    expect(firstFieldToFix({})).toBeNull();
  });

  it('tucks away only the optional fields, which come last', () => {
    expect([...TUCKED_AWAY].sort()).toEqual(['deliveryNotes', 'email']);
    expect(FIELD_ORDER.slice(-2).every((field) => TUCKED_AWAY.has(field))).toBe(true);
  });

  it('offers 1, 2 and 3 cars, never past the maximum, and « more » only when allowed', () => {
    expect(quantityCards(10)).toEqual([1, 2, 3]);
    expect(quantityCards(2)).toEqual([1, 2]);
    expect(allowsMore(10)).toBe(true);
    expect(allowsMore(3)).toBe(false);
  });

  it('keeps a quantity between 1 and the maximum', () => {
    expect(clampQuantity(0, 10)).toBe(1);
    expect(clampQuantity(11, 10)).toBe(10);
    expect(clampQuantity(4.7, 10)).toBe(4);
    expect(clampQuantity(Number.NaN, 10)).toBe(1);
  });
});

describe('the ad page’s short form', () => {
  const order = {
    quantity: '2',
    customerName: 'Samir Benali',
    phone: '0661 22 33 44',
    email: '',
    wilayaCode: '31',
    commune: '',
    address: '',
    deliveryType: 'HOME',
    deliveryNotes: '',
  };

  it('takes an order without commune or address: they are asked on the call', () => {
    const parsed = shortOrderInputSchema(10).safeParse(order);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect([parsed.data.commune, parsed.data.address]).toEqual(['', '']);
  });

  it('also takes them missing altogether — the short form has no such fields', () => {
    const { commune: _commune, address: _address, ...withoutThem } = order;
    expect(shortOrderInputSchema(10).safeParse(withoutThem).success).toBe(true);
  });

  it('still needs a name, a mobile and the wilaya', () => {
    expect(shortOrderInputSchema(10).safeParse({ ...order, customerName: '' }).success).toBe(false);
    expect(shortOrderInputSchema(10).safeParse({ ...order, phone: '' }).success).toBe(false);
    expect(shortOrderInputSchema(10).safeParse({ ...order, wilayaCode: '' }).success).toBe(false);
  });

  it('leaves the order page’s rules as they were: commune and address required', () => {
    const parsed = orderInputSchema(10).safeParse(order);
    expect(parsed.success).toBe(false);
  });
});
