import { describe, expect, it } from 'vitest';
import { ADMIN_SESSION_TTL_SECONDS, openAdminSession, sealAdminSession } from '@/lib/admin/sessionToken';

const SECRET = 'test-secret-with-enough-entropy-0123456789';
const ADMIN_ID = '65f0c0ffee0000000000abcd';

describe('admin session token', () => {
  it('round-trips claims and sets an 8h expiry', async () => {
    const now = Date.UTC(2026, 8, 19, 12);
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, SECRET, now);
    const claims = await openAdminSession(token, SECRET, now);
    expect(claims).toEqual({ sub: ADMIN_ID, role: 'ADMIN', exp: now / 1000 + ADMIN_SESSION_TTL_SECONDS });
  });

  it('does not reveal the admin id in the cookie value', async () => {
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, SECRET);
    expect(token).not.toContain(ADMIN_ID);
    expect(atob(token.split('.')[2]!.replace(/-/g, '+').replace(/_/g, '/'))).not.toContain(ADMIN_ID);
  });

  it('rejects expired tokens', async () => {
    const now = Date.now();
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'SUPPORT' }, SECRET, now);
    expect(await openAdminSession(token, SECRET, now + (ADMIN_SESSION_TTL_SECONDS + 1) * 1000)).toBeNull();
  });

  it('rejects a token sealed with another secret', async () => {
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, SECRET);
    expect(await openAdminSession(token, `${SECRET}-other`)).toBeNull();
  });

  it('rejects any tampering', async () => {
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, SECRET);
    const [v, iv, data] = token.split('.') as [string, string, string];
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
    expect(await openAdminSession(`${v}.${flip(iv)}.${data}`, SECRET)).toBeNull();
    expect(await openAdminSession(`${v}.${iv}.${flip(data)}`, SECRET)).toBeNull();
    expect(await openAdminSession(`v2.${iv}.${data}`, SECRET)).toBeNull();
    expect(await openAdminSession(`${token}.extra`, SECRET)).toBeNull();
  });

  it('rejects garbage and missing inputs', async () => {
    expect(await openAdminSession(undefined, SECRET)).toBeNull();
    expect(await openAdminSession('not-a-token', SECRET)).toBeNull();
    expect(await openAdminSession('v1.!!.??', SECRET)).toBeNull();
    const token = await sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, SECRET);
    expect(await openAdminSession(token, undefined)).toBeNull();
  });

  it('refuses to seal without a secret', async () => {
    await expect(sealAdminSession({ sub: ADMIN_ID, role: 'ADMIN' }, undefined)).rejects.toThrow('AUTH_SECRET');
  });

  /**
   * Customer sessions are Auth.js tokens signed from the same AUTH_SECRET. A
   * customer must never be able to paste one into the admin cookie: the admin
   * key is derived under its own HKDF label, and the format differs too.
   */
  it('rejects an Auth.js session token, even though both derive from AUTH_SECRET', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NWYwYzBmZmVlMDAwMDAwMDAwMGFiY2QifQ.c2lnbmF0dXJl';
    const jwe = ['eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0', 'AAAA', 'BBBB', 'CCCC', 'DDDD'].join('.');
    expect(await openAdminSession(jwt, SECRET)).toBeNull();
    expect(await openAdminSession(jwe, SECRET)).toBeNull();
    // ...and the same payload re-labelled as an admin token is still refused.
    expect(await openAdminSession(`v1.${jwt.split('.')[1]}.${jwt.split('.')[2]}`, SECRET)).toBeNull();
  });
});
