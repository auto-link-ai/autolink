import { beforeEach, describe, expect, it, vi } from 'vitest';

const PHONE = '0661001122';
const afterQueue: Array<() => Promise<void> | void> = [];
const deliver = vi.fn(async () => true);
const issueCode = vi.fn();
const checkCode = vi.fn();
const resendCode = vi.fn();
const replacePin = vi.fn(async () => true);
const findByPhone = vi.fn();
const findLive = vi.fn();

vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => void afterQueue.push(task) }));
vi.mock('@/lib/auth/codes', () => ({ issueCode, checkCode, resendCode }));
vi.mock('@/lib/auth/pinChange', () => ({ replacePin }));
vi.mock('@/lib/db/repositories/users', () => ({ usersRepository: { findByPhone } }));
vi.mock('@/lib/db/repositories/phoneCodes', () => ({ phoneCodesRepository: { findLive } }));

const { finishPinReset, requestPinReset } = await import('@/lib/auth/pinReset');

beforeEach(() => {
  vi.clearAllMocks();
  afterQueue.length = 0;
  issueCode.mockResolvedValue({ ok: true, challengeId: 'CHL-9', deliver });
  findLive.mockResolvedValue({ phone: PHONE, tagId: null, details: null, decoy: false });
  checkCode.mockResolvedValue({ ok: true, challenge: { phone: PHONE, tagId: null, details: null, decoy: false } });
  findByPhone.mockResolvedValue({ id: 'u7', status: 'ACTIVE' });
});

describe('requestPinReset', () => {
  it('answers the same for a number with or without an account', async () => {
    const real = await requestPinReset(PHONE, 'ip');
    findByPhone.mockResolvedValue(null);
    const unknown = await requestPinReset('0770000000', 'ip');
    expect(real).toEqual({ step: 'code', challengeId: 'CHL-9', phoneHint: '06 •• •• 11 22' });
    expect(unknown).toEqual({ step: 'code', challengeId: 'CHL-9', phoneHint: '07 •• •• 00 00' });
    // A number without an account gets a decoy: limits counted, nothing ever sent.
    expect(issueCode.mock.calls.map(([input]) => input.decoy)).toEqual([false, true]);
  });

  it('treats a blocked account like no account', async () => {
    findByPhone.mockResolvedValue({ id: 'u7', status: 'BLOCKED' });
    await requestPinReset(PHONE, 'ip');
    expect(issueCode.mock.calls[0]![0].decoy).toBe(true);
  });

  it('sends after the response, so both answers take as long', async () => {
    await requestPinReset(PHONE, 'ip');
    expect(deliver).not.toHaveBeenCalled();
    await Promise.all(afterQueue.map((task) => task()));
    expect(deliver).toHaveBeenCalledOnce();
  });

  it('passes on a refusal from the limits', async () => {
    issueCode.mockResolvedValue({ ok: false, reason: 'rate_limited' });
    await expect(requestPinReset(PHONE, 'ip')).resolves.toEqual({ step: 'phone', formError: 'rate_limited' });
  });
});

describe('finishPinReset', () => {
  const finish = (changes = {}) => finishPinReset({ challengeId: 'CHL-9', code: '123456', pin: '4071', pinConfirm: '4071', ...changes });

  it('replaces the PIN of the account the code proved', async () => {
    await expect(finish()).resolves.toEqual({ ok: true, phone: PHONE });
    expect(replacePin).toHaveBeenCalledWith('u7', PHONE, '4071');
  });

  it('refuses a weak PIN before spending the code', async () => {
    await expect(finish({ pin: '1122', pinConfirm: '1122' })).resolves.toMatchObject({ ok: false, state: { fieldErrors: { pin: 'pin_weak' } } });
    expect(checkCode).not.toHaveBeenCalled();
  });

  it('changes nothing on a wrong code', async () => {
    checkCode.mockResolvedValue({ ok: false, reason: 'invalid' });
    await expect(finish()).resolves.toMatchObject({ ok: false, state: { fieldErrors: { code: 'code_invalid' } } });
    expect(replacePin).not.toHaveBeenCalled();
  });
});
