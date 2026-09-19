import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getClientIp, hashForKey, hashIp } from '@/lib/security/ipHash';

describe('ip hashing', () => {
  const original = process.env.IP_HASH_SALT;
  beforeEach(() => {
    process.env.IP_HASH_SALT = 'salt-a';
  });
  afterEach(() => {
    process.env.IP_HASH_SALT = original;
  });

  it('is deterministic, salted, and never contains the IP', () => {
    const a = hashIp('41.200.10.5');
    expect(a).toBe(hashIp('41.200.10.5'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('41.200');
    process.env.IP_HASH_SALT = 'salt-b';
    expect(hashIp('41.200.10.5')).not.toBe(a);
  });

  it('namespaces other identifiers and ignores case/whitespace', () => {
    expect(hashForKey('admin-email', ' Admin@AutoLink.dz ')).toBe(hashForKey('admin-email', 'admin@autolink.dz'));
    expect(hashForKey('admin-email', 'x')).not.toBe(hashIp('x'));
  });

  it('throws without a salt', () => {
    delete process.env.IP_HASH_SALT;
    expect(() => hashIp('1.2.3.4')).toThrow('IP_HASH_SALT');
  });

  it('reads the client IP from proxy headers', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '41.1.1.1, 10.0.0.1' }))).toBe('41.1.1.1');
    expect(getClientIp(new Headers({ 'x-real-ip': '41.2.2.2' }))).toBe('41.2.2.2');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
