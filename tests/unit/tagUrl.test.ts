import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveQrBaseUrl, tagUrl } from '@/lib/tags/tagUrl';

describe('resolveQrBaseUrl', () => {
  // The suite must not depend on the shell it runs in: this value is read from
  // the environment by default.
  afterEach(() => vi.unstubAllEnvs());

  it('accepts a bare https origin in production', () => {
    expect(resolveQrBaseUrl('https://autolink.dz', true)).toEqual({ ok: true, baseUrl: 'https://autolink.dz' });
    expect(resolveQrBaseUrl('https://autolink.dz/', true)).toEqual({ ok: true, baseUrl: 'https://autolink.dz' });
  });

  it('accepts LAN and localhost URLs in development', () => {
    expect(resolveQrBaseUrl('http://192.168.1.20:3000', false)).toEqual({ ok: true, baseUrl: 'http://192.168.1.20:3000' });
    expect(resolveQrBaseUrl('http://localhost:3000', false).ok).toBe(true);
  });

  it('falls back to NEXT_PUBLIC_APP_URL when the caller passes nothing', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://autolink.dz');
    expect(resolveQrBaseUrl(undefined, true)).toEqual({ ok: true, baseUrl: 'https://autolink.dz' });
    // Unset: generation must refuse rather than print a sticker pointing nowhere.
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(resolveQrBaseUrl(undefined, true)).toEqual({ ok: false, problem: 'base_url_missing', value: null });
  });

  it.each([
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

