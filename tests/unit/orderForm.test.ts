import { describe, expect, it } from 'vitest';
import {
  allowsMore,
  clampQuantity,
  FIELD_ORDER,
  firstFieldToFix,
  quantityCards,
  TUCKED_AWAY,
} from '@/app/[locale]/(site)/order/orderFieldOrder';
import { orderInputSchema } from '@/lib/validation/order';

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
