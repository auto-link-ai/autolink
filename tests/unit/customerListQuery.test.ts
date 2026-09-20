import { describe, expect, it } from 'vitest';
import {
  customerListReturnPath,
  customerListSearch,
  parseCustomerListQuery,
  parseCustomerResult,
} from '@/lib/admin/customerListQuery';
import { generatePublicUserId } from '@/lib/tags/generate';
import { isValidPublicUserId, PUBLIC_USER_ID_PATTERN } from '@/lib/validation/publicUserId';

const ID = 'USR-7K3M9QXZ';

describe('public account ids', () => {
  it('generates the documented shape, and a different one every time', () => {
    const ids = new Set(Array.from({ length: 50 }, generatePublicUserId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(PUBLIC_USER_ID_PATTERN);
  });

  it('rejects anything else, including look-alike characters', () => {
    expect(isValidPublicUserId(ID)).toBe(true);
    // I, L, O and U are not in the Crockford alphabet.
    for (const bad of ['USR-7K3M9QXI', 'USR-7K3M9QX', 'usr-7k3m9qxz', 'AUT-7K3M9QXZ', '', null, 42]) {
      expect(isValidPublicUserId(bad), String(bad)).toBe(false);
    }
  });
});

describe('parseCustomerListQuery', () => {
  it('reads a phone number as a phone', () => {
    const query = parseCustomerListQuery({ q: '0551 23 45 67' });
    expect(query.phone).toBe('0551234567');
    expect(query.email).toBeUndefined();
  });

  it('reads anything else as an email fragment', () => {
    const query = parseCustomerListQuery({ q: 'amine@' });
    expect(query.email).toBe('amine@');
    expect(query.phone).toBeUndefined();
  });

  it('keeps only a known status and a well-formed account id', () => {
    expect(parseCustomerListQuery({ status: 'BLOCKED', id: ID }).status).toBe('BLOCKED');
    expect(parseCustomerListQuery({ status: 'DELETED' }).status).toBeUndefined();
    expect(parseCustomerListQuery({ id: 'USR-nope' }).id).toBeUndefined();
    expect(parseCustomerListQuery({ id: "'; drop" }).id).toBeUndefined();
  });

  it('clamps the page and survives junk', () => {
    expect(parseCustomerListQuery({ page: '0' }).page).toBe(1);
    expect(parseCustomerListQuery({ page: 'abc' }).page).toBe(1);
    expect(parseCustomerListQuery({ page: '-3' }).page).toBe(1);
    expect(parseCustomerListQuery({ page: '99999999' }).page).toBe(100_000);
    expect(parseCustomerListQuery({}).page).toBe(1);
  });

  it('caps the search text so a huge query never reaches the database', () => {
    expect(parseCustomerListQuery({ q: 'x'.repeat(500) }).q).toHaveLength(60);
  });
});

describe('customerListSearch', () => {
  it('drops defaults and keeps the rest', () => {
    expect(customerListSearch({ page: 1 })).toBe('');
    expect(customerListSearch({ status: 'ACTIVE', q: 'a@b', page: 3, id: ID })).toBe(
      `?status=ACTIVE&q=a%40b&page=3&id=${ID}`,
    );
  });
});

describe('customerListReturnPath', () => {
  it('rebuilds the list URL with the result code', () => {
    expect(customerListReturnPath('fr', '?status=BLOCKED&page=2', 'ok')).toBe(
      '/fr/admin/customers?status=BLOCKED&page=2&result=ok',
    );
  });

  it('refuses to carry a forged destination', () => {
    // Anything that is not one of the known list parameters is dropped.
    expect(customerListReturnPath('fr', '?next=https://evil.example', 'ok')).toBe('/fr/admin/customers?result=ok');
    expect(customerListReturnPath('fr', 'https://evil.example', 'ok')).toBe('/fr/admin/customers?result=ok');
    expect(customerListReturnPath('en', undefined, 'invalid')).toBe('/en/admin/customers?result=invalid');
  });
});

describe('parseCustomerResult', () => {
  it('accepts only known codes', () => {
    expect(parseCustomerResult('ok')).toBe('ok');
    expect(parseCustomerResult('not_allowed')).toBe('not_allowed');
    expect(parseCustomerResult('<script>')).toBeNull();
    expect(parseCustomerResult(undefined)).toBeNull();
  });
});
