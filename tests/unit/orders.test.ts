import { describe, expect, it } from 'vitest';
import { orderListReturnPath, parseOrderListQuery } from '@/lib/admin/orderListQuery';
import { csvCell, csvRow } from '@/lib/format/csv';
import { generateOrderRef, isValidOrderRef, normalizeOrderRefInput } from '@/lib/orders/ref';
import { computeOrderTotals } from '@/lib/orders/totals';
import { availableOrderActions, canApplyOrderAction, canAssignTags, orderTargetStatus } from '@/lib/orders/transitions';
import { orderFieldErrors, orderInputSchema } from '@/lib/validation/order';

describe('order reference', () => {
  it('is AL- plus 6 Crockford characters and never repeats', () => {
    const refs = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const ref = generateOrderRef();
      expect(ref).toMatch(/^AL-[0-9A-HJKMNP-TV-Z]{6}$/);
      expect(isValidOrderRef(ref)).toBe(true);
      refs.add(ref);
    }
    expect(refs.size).toBe(500);
  });

  it('normalizes what an admin types', () => {
    expect(normalizeOrderRefInput('al-7k3m9q')).toBe('AL-7K3M9Q');
    expect(normalizeOrderRefInput(' 7K3M9Q ')).toBe('AL-7K3M9Q');
    // I/L/O are read as 1/1/0, the Crockford way.
    expect(normalizeOrderRefInput('AL-7K3M9O')).toBe('AL-7K3M90');
    expect(normalizeOrderRefInput('nope')).toBeNull();
    expect(isValidOrderRef('AL-7K3M9')).toBe(false);
  });
});

describe('order totals', () => {
  const pricing = { unitPrice: 1500, deliveryFees: [{ wilayaCode: 16, home: 600, stopdesk: 400 }] };

  it('multiplies the unit price and adds the fee for the chosen delivery type', () => {
    expect(computeOrderTotals({ quantity: 2, wilayaCode: 16, deliveryType: 'HOME' }, pricing)).toEqual({
      unitPrice: 1500,
      deliveryFee: 600,
      totalPrice: 3600,
    });
    expect(computeOrderTotals({ quantity: 1, wilayaCode: 16, deliveryType: 'STOPDESK' }, pricing)).toEqual({
      unitPrice: 1500,
      deliveryFee: 400,
      totalPrice: 1900,
    });
  });

  it('refuses a wilaya with no configured fee instead of charging zero', () => {
    expect(computeOrderTotals({ quantity: 1, wilayaCode: 31, deliveryType: 'HOME' }, pricing)).toBeNull();
  });
});

describe('order transitions', () => {
  it('follows the workflow and nothing else', () => {
    expect(orderTargetStatus('confirm')).toBe('CONFIRMED');
    expect(canApplyOrderAction('confirm', 'PENDING')).toBe(true);
    expect(canApplyOrderAction('confirm', 'SHIPPED')).toBe(false);
    expect(canApplyOrderAction('ship', 'PREPARING')).toBe(true);
    expect(canApplyOrderAction('deliver', 'PREPARING')).toBe(false);
  });

  it('allows cancelling only before shipping', () => {
    expect(availableOrderActions('PENDING')).toEqual(['confirm', 'cancel']);
    expect(availableOrderActions('PREPARING')).toEqual(['ship', 'cancel']);
    expect(availableOrderActions('SHIPPED')).toEqual(['deliver']);
    expect(availableOrderActions('DELIVERED')).toEqual([]);
    expect(availableOrderActions('CANCELLED')).toEqual([]);
  });

  it('assigns tags only while confirming or packing', () => {
    expect(canAssignTags('CONFIRMED')).toBe(true);
    expect(canAssignTags('PREPARING')).toBe(true);
    expect(canAssignTags('PENDING')).toBe(false);
    expect(canAssignTags('SHIPPED')).toBe(false);
  });
});

describe('order input', () => {
  const valid = {
    quantity: '2',
    customerName: '  Amine   Belkacem ',
    phone: '0550 12 34 56',
    email: ' Amine@Example.COM ',
    wilayaCode: '16',
    commune: 'Bab Ezzouar',
    address: 'Cité 200 logements, bât B',
    deliveryType: 'HOME',
    deliveryNotes: '',
  };

  it('normalizes the phone, the email and the spacing', () => {
    const parsed = orderInputSchema(10).parse(valid);
    expect(parsed.phone).toBe('0550123456');
    expect(parsed.email).toBe('amine@example.com');
    expect(parsed.customerName).toBe('Amine Belkacem');
    expect(parsed.deliveryNotes).toBeNull();
    expect(parsed.quantity).toBe(2);
  });

  it('rejects a non-Algerian mobile with a stable code', () => {
    const result = orderInputSchema(10).safeParse({ ...valid, phone: '+33 6 12 34 56 78' });
    expect(result.success).toBe(false);
    if (!result.success) expect(orderFieldErrors(result.error).phone).toBe('invalid_phone');
  });

  it('caps the quantity at the settings maximum', () => {
    expect(orderInputSchema(5).safeParse({ ...valid, quantity: '6' }).success).toBe(false);
    expect(orderInputSchema(5).safeParse({ ...valid, quantity: '5' }).success).toBe(true);
  });
});

describe('admin order list query', () => {
  it('resolves a search to a reference or a phone, and flags anything else', () => {
    expect(parseOrderListQuery({ q: 'al-7k3m9q' }).orderRef).toBe('AL-7K3M9Q');
    expect(parseOrderListQuery({ q: '0550 12 34 56' }).phone).toBe('0550123456');
    expect(parseOrderListQuery({ q: 'hello' }).invalidSearch).toBe(true);
  });

  it('drops unknown parameters from the return path', () => {
    const path = orderListReturnPath('fr', '?status=PENDING&evil=1&page=3', 'ok');
    expect(path).toContain('/fr/admin/orders?');
    expect(path).toContain('status=PENDING');
    expect(path).toContain('page=3');
    expect(path).toContain('result=ok');
    expect(path).not.toContain('evil');
  });
});

describe('csv escaping', () => {
  it('quotes separators and neutralizes spreadsheet formulas', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+33600000000')).toBe("'+33600000000");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@handle')).toBe("'@handle");
    expect(csvCell(null)).toBe('');
    expect(csvRow(['a', 1, null])).toBe('a,1,');
  });
});
