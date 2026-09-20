import { describe, expect, it } from 'vitest';
import { claimUrl, resolveQrBaseUrl, tagUrl } from '@/lib/tags/tagUrl';

describe('resolveQrBaseUrl', () => {
  it('accepts a bare https origin in production', () => {
    expect(resolveQrBaseUrl('https://autolink.dz', true)).toEqual({ ok: true, baseUrl: 'https://autolink.dz' });
    expect(resolveQrBaseUrl('https://autolink.dz/', true)).toEqual({ ok: true, baseUrl: 'https://autolink.dz' });
  });

  it('accepts LAN and localhost URLs in development', () => {
    expect(resolveQrBaseUrl('http://192.168.1.20:3000', false)).toEqual({ ok: true, baseUrl: 'http://192.168.1.20:3000' });
    expect(resolveQrBaseUrl('http://localhost:3000', false).ok).toBe(true);
  });

  it.each([
    [undefined, 'base_url_missing'],
    ['', 'base_url_missing'],
    ['autolink.dz', 'base_url_invalid'],
    ['https://autolink.dz/app', 'base_url_invalid'],
    ['https://autolink.dz/?x=1', 'base_url_invalid'],
    ['ftp://autolink.dz', 'base_url_invalid'],
    ['https://user:pw@autolink.dz', 'base_url_invalid'],
    ['http://autolink.dz', 'base_url_not_https'],
    ['https://localhost', 'base_url_local_host'],
    ['https://127.0.0.1', 'base_url_local_host'],
    ['https://41.200.10.5', 'base_url_local_host'],
  ])('production rejects %j (%s)', (value, problem) => {
    const result = resolveQrBaseUrl(value, true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toBe(problem);
  });
});

describe('tagUrl', () => {
  it('encodes only the public tag URL', () => {
    expect(tagUrl('https://autolink.dz', 'AUT-7K3M9QXZ')).toBe('https://autolink.dz/t/AUT-7K3M9QXZ');
  });

  it('refuses malformed ids', () => {
    expect(() => tagUrl('https://autolink.dz', 'AUT-7K3M9QXU')).toThrow(RangeError);
  });
});

describe('claimUrl', () => {
  it('points at the activation page with both values', () => {
    expect(claimUrl('https://autolink.dz', 'fr', 'AUT-7K3M9QXZ', 'ABCD-EFGH-JK')).toBe(
      'https://autolink.dz/fr/activate?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK',
    );
  });

  it('never points at the public scan page', () => {
    expect(claimUrl('https://autolink.dz', 'ar', 'AUT-7K3M9QXZ', 'ABCD-EFGH-JK')).not.toContain('/t/');
  });

  it('refuses a malformed id or code, so a broken claim QR is never printed', () => {
    expect(() => claimUrl('https://autolink.dz', 'fr', 'AUT-BAD', 'ABCD-EFGH-JK')).toThrow(RangeError);
    expect(() => claimUrl('https://autolink.dz', 'fr', 'AUT-7K3M9QXZ', 'abcd-efgh')).toThrow(RangeError);
  });
});
