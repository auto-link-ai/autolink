import { describe, expect, it } from 'vitest';
import {
  normalizeIdSearch,
  parseTagListQuery,
  parseTransitionResult,
  tagListReturnPath,
  tagListSearch,
} from '@/lib/admin/tagListQuery';

describe('admin tag list query', () => {
  it('parses valid params and ignores junk', () => {
    expect(parseTagListQuery({ status: 'ACTIVE', q: 'aut-7k3m', page: '3' })).toEqual({
      status: 'ACTIVE',
      q: 'aut-7k3m',
      idPrefix: '7K3M',
      invalidSearch: false,
      page: 3,
    });
    expect(parseTagListQuery({ status: 'HACKED', page: '-4' })).toMatchObject({ status: undefined, page: 1 });
    expect(parseTagListQuery({ q: 'AUT-UUU' })).toMatchObject({ invalidSearch: true, idPrefix: undefined });
  });

  it('normalizes id searches to a safe Crockford prefix', () => {
    expect(normalizeIdSearch('AUT-7K3M 9QXZ')).toBe('7K3M9QXZ');
    expect(normalizeIdSearch('7kom')).toBe('7K0M');
    expect(normalizeIdSearch('.*')).toBeNull();
    expect(normalizeIdSearch('AUT-7K3M9QXZZ')).toBeNull();
  });

  it('builds list URLs without defaults', () => {
    expect(tagListSearch({ page: 1 })).toBe('');
    expect(tagListSearch({ status: 'LOST', q: '7K', page: 2 })).toBe('?status=LOST&q=7K&page=2');
  });

  it('only returns to the tag list, whatever returnSearch says', () => {
    expect(tagListReturnPath('fr', '?status=ACTIVE&page=2', 'ok')).toBe('/fr/admin/tags?status=ACTIVE&page=2&result=ok');
    expect(tagListReturnPath('ar', '//evil.example/x', 'conflict')).toBe('/ar/admin/tags?result=conflict');
    expect(tagListReturnPath('en', '?next=https://evil.example', 'ok')).toBe('/en/admin/tags?result=ok');
  });

  it('accepts only known result codes', () => {
    expect(parseTransitionResult('ok')).toBe('ok');
    expect(parseTransitionResult('<script>')).toBeNull();
  });
});
