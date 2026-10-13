import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const findById = vi.fn();

vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/db/repositories/users', () => ({ usersRepository: { findById } }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { getOwnerSession } = await import('@/lib/auth/session');

const USER = { id: 'u1', firstName: 'Amine', phone: '0551234567', status: 'ACTIVE', sessionVersion: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue(USER);
});

describe('getOwnerSession', () => {
  it('lets in a token issued with the account’s current session version', async () => {
    auth.mockResolvedValue({ user: { id: 'u1', sv: 2 } });
    await expect(getOwnerSession()).resolves.toEqual({
      actor: { kind: 'owner', userId: 'u1' },
      phone: '0551234567',
      firstName: 'Amine',
    });
  });

  it('signs out a device whose token predates a new PIN', async () => {
    auth.mockResolvedValue({ user: { id: 'u1', sv: 1 } });
    await expect(getOwnerSession()).resolves.toBeNull();
  });

  it('signs out a token from before session versions existed', async () => {
    auth.mockResolvedValue({ user: { id: 'u1', sv: -1 } });
    await expect(getOwnerSession()).resolves.toBeNull();
  });

  it('signs out a blocked account at once', async () => {
    auth.mockResolvedValue({ user: { id: 'u1', sv: 2 } });
    findById.mockResolvedValue({ ...USER, status: 'BLOCKED' });
    await expect(getOwnerSession()).resolves.toBeNull();
  });

  it('has no session without a signed-in user', async () => {
    auth.mockResolvedValue(null);
    await expect(getOwnerSession()).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });
});
