import { beforeEach, describe, expect, it, vi } from 'vitest';

const TAG = 'AUT-7K3M9QXZ';
const OWNER = { kind: 'owner', userId: '507f1f77bcf86cd799439011' } as const;
const UNDESCRIBED = { brand: '', model: '', color: '', plateNumber: null, showDetailsPublicly: true };

const hit = vi.fn(async () => ({ allowed: true, remaining: 4 }));
const claim = vi.fn(async () => ({ ok: true }) as { ok: true } | { ok: false; reason: 'taken' });

vi.mock('@/lib/config/settings', () => ({
  getSettings: async () => ({ rateLimitActivationPerIpPerHour: 5 }),
}));
vi.mock('@/lib/db/repositories/rateLimits', () => ({ rateLimitsRepository: { hit } }));
vi.mock('@/lib/db/repositories/tagsOwner', () => ({ ownerTagsRepository: { claim } }));

const { claimTag } = await import('@/lib/activation/claim');

const attempt = (tagId = TAG) => claimTag(OWNER, tagId, { ipHash: 'ip' });

beforeEach(() => {
  vi.clearAllMocks();
  hit.mockResolvedValue({ allowed: true, remaining: 4 });
  claim.mockResolvedValue({ ok: true });
});

describe('claimTag: scan, sign in, linked', () => {
  it('links a sticker with no code, the car to be described later', async () => {
    await expect(attempt()).resolves.toEqual({ ok: true, publicTagId: TAG });
    expect(claim).toHaveBeenCalledWith(OWNER, TAG, UNDESCRIBED);
  });

  it('accepts the id as a person types it', async () => {
    await expect(attempt(' aut-7k3m9qxz ')).resolves.toEqual({ ok: true, publicTagId: TAG });
  });

  it('answers invalid when the sticker is not free — linked, unknown, deactivated, or taken in a race', async () => {
    claim.mockResolvedValue({ ok: false, reason: 'taken' });
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('never reaches the database for a malformed id', async () => {
    await expect(attempt('AUT-BAD')).resolves.toEqual({ ok: false, reason: 'invalid' });
    await expect(attempt('<script>')).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(claim).not.toHaveBeenCalled();
  });

  it('stops at the rate limit before touching the sticker', async () => {
    hit.mockResolvedValue({ allowed: false, remaining: 0 });
    await expect(attempt()).resolves.toEqual({ ok: false, reason: 'rate_limited' });
    expect(claim).not.toHaveBeenCalled();
  });
});
