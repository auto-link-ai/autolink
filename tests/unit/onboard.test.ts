import { beforeEach, describe, expect, it, vi } from 'vitest';

const TAG = 'AUT-7K3M9QXZ';
const PHONE = '0551234567';
const DETAILS = { firstName: 'Amine', lastName: 'Belkacem', brand: 'Renault', model: 'Symbol', locale: 'fr' as const };
const CHALLENGE = { phone: PHONE, tagId: TAG, details: DETAILS, decoy: false };

const deliver = vi.fn(async () => true);
const issueCode = vi.fn();
const checkCode = vi.fn();
const resendCode = vi.fn();
const replacePin = vi.fn(async () => true);
const clearPinAttempts = vi.fn(async () => undefined);
const activate = vi.fn();
const findLive = vi.fn();
const findForScanner = vi.fn();
const findForPinLogin = vi.fn();
const withinActivationLimit = vi.fn(async () => true);

vi.mock('@/lib/auth/codes', () => ({ issueCode, checkCode, resendCode }));
vi.mock('@/lib/auth/pinChange', () => ({ replacePin }));
vi.mock('@/lib/auth/pinLimits', () => ({ clearPinAttempts }));
vi.mock('@/lib/db/repositories/onboarding', () => ({ onboardingRepository: { activate } }));
vi.mock('@/lib/db/repositories/phoneCodes', () => ({ phoneCodesRepository: { findLive } }));
vi.mock('@/lib/db/repositories/tagsScanner', () => ({ scannerTagsRepository: { findForScanner } }));
vi.mock('@/lib/db/repositories/users', () => ({ usersRepository: { findForPinLogin } }));
vi.mock('@/lib/activation/claim', () => ({ withinActivationLimit }));
vi.mock('@/lib/security/pin', () => ({
  hashPin: async (pin: string) => `hash:${pin}`,
  verifyPin: async (hash: string, pin: string) => hash === `hash:${pin}`,
}));

const { finishActivation, resendActivationCode, startActivation } = await import('@/lib/activation/onboard');

const FORM = {
  firstName: 'Amine',
  lastName: 'Belkacem',
  phone: '0551 23 45 67',
  brand: 'Renault',
  brandOther: '',
  model: 'Symbol',
  pin: '4071',
  pinConfirm: '4071',
  tagId: TAG,
};
const start = (changes: Partial<typeof FORM> = {}) => startActivation({ ...FORM, ...changes }, 'fr', 'ip-hash');
const finish = (changes: Partial<{ code: string; pin: string; pinConfirm: string }> = {}) =>
  finishActivation({ challengeId: 'CHL-1', code: '123456', pin: '4071', pinConfirm: '4071', ...changes });

beforeEach(() => {
  vi.clearAllMocks();
  findForScanner.mockResolvedValue({ state: 'waiting', publicTagId: TAG });
  issueCode.mockResolvedValue({ ok: true, challengeId: 'CHL-1', deliver });
  deliver.mockResolvedValue(true);
  findLive.mockResolvedValue(CHALLENGE);
  checkCode.mockResolvedValue({ ok: true, challenge: CHALLENGE });
  findForPinLogin.mockResolvedValue(null);
  activate.mockResolvedValue({ ok: true, userId: 'u1', created: true });
  withinActivationLimit.mockResolvedValue(true);
});

describe('startActivation: the one screen', () => {
  it('sends the WhatsApp code once everything checks out, with the sticker and details in the challenge', async () => {
    await expect(start()).resolves.toEqual({ step: 'code', challengeId: 'CHL-1', phoneHint: '05 •• •• 45 67' });
    expect(issueCode).toHaveBeenCalledWith({
      phone: PHONE,
      purpose: 'ACTIVATE',
      ipHash: 'ip-hash',
      tagId: TAG,
      details: DETAILS,
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it('takes the brand typed under « Autre »', async () => {
    await start({ brand: 'other', brandOther: 'Lada' });
    expect(issueCode.mock.calls[0]![0].details.brand).toBe('Lada');
  });

  it.each([
    [{ pin: '1234', pinConfirm: '1234' }, { pin: 'pin_weak' }],
    [{ pin: '4071', pinConfirm: '4017' }, { pinConfirm: 'pin_mismatch' }],
    [{ pin: '4567', pinConfirm: '4567', phone: '0550124567' }, { pin: 'pin_weak' }],
    [{ phone: '12' }, { phone: 'invalid_phone' }],
    [{ brand: 'other', brandOther: '' }, { brand: 'required', brandOther: 'required' }],
  ])('sends nothing while a field is wrong: %o', async (changes, errors) => {
    const state = await start(changes);
    expect(state).toMatchObject({ step: 'details', fieldErrors: errors });
    expect(issueCode).not.toHaveBeenCalled();
  });

  it('pays for no message when the sticker is no longer waiting', async () => {
    findForScanner.mockResolvedValue({ state: 'linked', publicTagId: TAG, vehicle: null });
    await expect(start()).resolves.toEqual({ step: 'details', formError: 'invalid' });
    expect(issueCode).not.toHaveBeenCalled();
  });

  it('stops at the activation limit, before any code', async () => {
    withinActivationLimit.mockResolvedValue(false);
    await expect(start()).resolves.toEqual({ step: 'details', formError: 'rate_limited' });
    expect(issueCode).not.toHaveBeenCalled();
  });

  it('says when codes cannot be sent at all', async () => {
    issueCode.mockResolvedValue({ ok: false, reason: 'unavailable' });
    await expect(start()).resolves.toEqual({ step: 'details', formError: 'code_unavailable' });
  });

  it('still moves to the code step when WhatsApp refused the send, with a way to resend', async () => {
    deliver.mockResolvedValue(false);
    await expect(start()).resolves.toMatchObject({ step: 'code', challengeId: 'CHL-1', formError: 'send_failed' });
  });
});

describe('finishActivation: the code, then the account and the sticker', () => {
  it('creates the account with the sticker and its car, from the challenge alone', async () => {
    await expect(finish()).resolves.toEqual({ ok: true, phone: PHONE, publicTagId: TAG, car: 'Renault Symbol', pinUpdated: false });
    expect(activate).toHaveBeenCalledWith(
      { firstName: 'Amine', lastName: 'Belkacem', phone: PHONE, pinHash: 'hash:4071', locale: 'fr' },
      TAG,
      { brand: 'Renault', model: 'Symbol', color: '', plateNumber: null, showDetailsPublicly: true },
    );
    expect(replacePin).not.toHaveBeenCalled();
    expect(clearPinAttempts).toHaveBeenCalledWith(PHONE);
  });

  it('adds the car to a number that already has an account, PIN unchanged', async () => {
    findForPinLogin.mockResolvedValue({ id: 'u1', pinHash: 'hash:4071', status: 'ACTIVE', sessionVersion: 0 });
    await expect(finish()).resolves.toMatchObject({ ok: true, pinUpdated: false });
    expect(replacePin).not.toHaveBeenCalled();
  });

  it('makes a newly typed PIN the account’s PIN: the code proved the owner', async () => {
    findForPinLogin.mockResolvedValue({ id: 'u1', pinHash: 'hash:9302', status: 'ACTIVE', sessionVersion: 3 });
    await expect(finish()).resolves.toMatchObject({ ok: true, pinUpdated: true });
    expect(replacePin).toHaveBeenCalledWith('u1', PHONE, '4071');
  });

  it('reports a wrong code on its field, and creates nothing', async () => {
    checkCode.mockResolvedValue({ ok: false, reason: 'invalid' });
    await expect(finish({ code: '000000' })).resolves.toEqual({
      ok: false,
      state: { step: 'code', challengeId: 'CHL-1', phoneHint: '05 •• •• 45 67', fieldErrors: { code: 'code_invalid' } },
    });
    expect(activate).not.toHaveBeenCalled();
  });

  it('never spends the code on a PIN typo', async () => {
    const result = await finish({ pinConfirm: '4017' });
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { pinConfirm: 'pin_mismatch' } } });
    expect(checkCode).not.toHaveBeenCalled();
  });

  it('says the code is over when the challenge is', async () => {
    findLive.mockResolvedValue(null);
    await expect(finish()).resolves.toMatchObject({ ok: false, state: { formError: 'code_expired' } });
    expect(checkCode).not.toHaveBeenCalled();
  });

  it('reports a sticker someone else won meanwhile, the same way as any unavailable sticker', async () => {
    activate.mockResolvedValue({ ok: false, reason: 'taken' });
    await expect(finish()).resolves.toMatchObject({ ok: false, state: { formError: 'invalid' } });
  });
});

describe('resendActivationCode', () => {
  it('sends nothing once the sticker is no longer waiting', async () => {
    findForScanner.mockResolvedValue(null);
    await expect(resendActivationCode('CHL-1', 'ip-hash')).resolves.toMatchObject({ step: 'code', formError: 'invalid' });
    expect(resendCode).not.toHaveBeenCalled();
  });

  it('asks to wait a minute between sends', async () => {
    resendCode.mockResolvedValue({ ok: false, reason: 'too_soon' });
    await expect(resendActivationCode('CHL-1', 'ip-hash')).resolves.toMatchObject({ formError: 'code_too_soon' });
  });

  it('confirms a new code went out', async () => {
    resendCode.mockResolvedValue({ ok: true, challenge: CHALLENGE, deliver });
    await expect(resendActivationCode('CHL-1', 'ip-hash')).resolves.toEqual({
      step: 'code',
      challengeId: 'CHL-1',
      phoneHint: '05 •• •• 45 67',
      notice: 'resent',
    });
  });
});
