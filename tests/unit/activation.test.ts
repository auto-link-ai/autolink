import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivationCandidate } from '@/lib/db/repositories/tagsOwner';
import { hashSecret } from '@/lib/security/password';

const TAG = 'AUT-7K3M9QXZ';
const CODE = 'ABCD-EFGH-JK';
const OWNER = { kind: 'owner', userId: '507f1f77bcf86cd799439011', email: 'a@b.dz' } as const;
const VEHICLE = { brand: 'Peugeot', model: '208', color: 'Bleu', plateNumber: null, showDetailsPublicly: false };

const hit = vi.fn(async () => ({ allowed: true, remaining: 4 }));
const findForActivation = vi.fn<(id: string) => Promise<ActivationCandidate | null>>();
const registerFailedAttempt = vi.fn(async () => undefined);
const claim = vi.fn(async () => ({ ok: true }) as { ok: true } | { ok: false; reason: 'taken' });

vi.mock('@/lib/config/settings', () => ({
  getSettings: async () => ({ rateLimitActivationPerIpPerHour: 5 }),
}));
vi.mock('@/lib/db/repositories/rateLimits', () => ({ rateLimitsRepository: { hit } }));
vi.mock('@/lib/db/repositories/tagsOwner', () => ({
  ownerTagsRepository: { findForActivation, registerFailedAttempt, claim },
}));

const { claimTag } = await import('@/lib/activation/claim');

const HASH = await hashSecret(CODE);
const candidate = (patch: Partial<ActivationCandidate> = {}): ActivationCandidate => ({
  publicTagId: TAG,
  status: 'UNASSIGNED',
  activationCodeHash: HASH,
  lockedUntil: null,
  ...patch,
});

const attempt = (tagId = TAG, code = CODE) =>
  claimTag(OWNER, { tagId, code, vehicle: VEHICLE }, { ipHash: 'ip' });

beforeEach(() => {
  vi.clearAllMocks();
  hit.mockResolvedValue({ allowed: true, remaining: 4 });
  claim.mockResolvedValue({ ok: true });
});

describe('claimTag', () => {
  it('claims an unassigned sticker when the code matches', async () => {
    findForActivation.mockResolvedValue(candidate());
    await expect(attempt()).resolves.toEqual({ ok: true, publicTagId: TAG });
    expect(claim).toHaveBeenCalledWith(OWNER, TAG, VEHICLE);
    expect(registerFailedAttempt).not.toHaveBeenCalled();
  });

  it('accepts the code as a person types it: lower case, spaces, I/O typos', async () => {
    findForActivation.mockResolvedValue(candidate());
    await expect(attempt('aut-7k3m9qxz', 'abcd efgh jk')).resolves.toEqual({ ok: true, publicTagId: TAG });
  });

  // Rule 9: every one of these answers `invalid`, so nobody can learn which stickers exist.
  it.each([
    ['an unknown tag', () => findForActivation.mockResolvedValue(null)],
    ['an already claimed tag', () => findForActivation.mockResolvedValue(candidate({ status: 'ACTIVE' }))],
    ['a suspended tag', () => findForActivation.mockResolvedValue(candidate({ status: 'SUSPENDED' }))],
    ['a lost tag', () => findForActivation.mockResolvedValue(candidate({ status: 'LOST' }))],
  ])('refuses %s with the generic answer', async (_label, arrange) => {
    arrange();
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('never reaches the database for a malformed id or code', async () => {
    await expect(attempt('AUT-BAD', CODE)).resolves.toEqual({ ok: false, reason: 'invalid' });
    await expect(attempt(TAG, 'nope')).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(findForActivation).not.toHaveBeenCalled();
  });

  it('counts a wrong code against the sticker', async () => {
    findForActivation.mockResolvedValue(candidate());
    await expect(attempt(TAG, 'ZZZZ-ZZZZ-ZZ')).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(registerFailedAttempt).toHaveBeenCalledWith(TAG);
    expect(claim).not.toHaveBeenCalled();
  });

  it('does not count an attempt once the sticker is locked, and does not check the code', async () => {
    findForActivation.mockResolvedValue(candidate({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'locked' });
    expect(registerFailedAttempt).not.toHaveBeenCalled();
  });

  it('lets a correct code through once the lock has expired', async () => {
    findForActivation.mockResolvedValue(candidate({ lockedUntil: new Date(Date.now() - 60_000) }));
    await expect(attempt()).resolves.toEqual({ ok: true, publicTagId: TAG });
  });

  it('answers invalid when another account won the race', async () => {
    findForActivation.mockResolvedValue(candidate());
    claim.mockResolvedValue({ ok: false, reason: 'taken' });
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('stops at the rate limit before touching the tag', async () => {
    hit.mockResolvedValue({ allowed: false, remaining: 0 });
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'rate_limited' });
    expect(findForActivation).not.toHaveBeenCalled();
  });
});
