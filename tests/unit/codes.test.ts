import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewChallenge } from '@/lib/db/repositories/phoneCodes';
import type { WhatsAppTemplateSend } from '@/lib/notifications/whatsapp';

// An in-memory phoneCodes collection with the repository's semantics.
type Row = NewChallenge & { attempts: number; consumedAt: Date | null };
const rows = new Map<string, Row>();
const live = (row: Row | undefined, purpose: string) =>
  row && row.purpose === purpose && !row.consumedAt && row.expiresAt > new Date() ? row : null;
const view = (row: Row) => ({ phone: row.phone, tagId: row.tagId, details: row.details, decoy: row.decoy });

const phoneCodesRepository = {
  create: vi.fn(async (challenge: NewChallenge) => void rows.set(challenge.publicId, { ...challenge, attempts: 0, consumedAt: null })),
  findLive: vi.fn(async (id: string, purpose: string) => {
    const row = live(rows.get(id), purpose);
    return row ? view(row) : null;
  }),
  spendAttempt: vi.fn(async (id: string, purpose: string, max: number) => {
    const row = live(rows.get(id), purpose);
    if (!row || row.attempts >= max) return null;
    row.attempts += 1;
    return { ...view(row), codeHash: row.codeHash };
  }),
  consume: vi.fn(async (id: string) => {
    const row = rows.get(id);
    if (!row || row.consumedAt) return false;
    row.consumedAt = new Date();
    return true;
  }),
  replaceCode: vi.fn(async (id: string, purpose: string, codeHash: string, expiresAt: Date) => {
    const row = live(rows.get(id), purpose);
    if (!row) return false;
    Object.assign(row, { codeHash, expiresAt, attempts: 0 });
    return true;
  }),
};

// Rate limits: a key is allowed until its limit is reached; tests can force a refusal.
const counts = new Map<string, number>();
const refuse = new Set<string>();
const hit = vi.fn(async (key: string, limit: number) => {
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  const prefix = [...refuse].find((p) => key.startsWith(p));
  return { allowed: !prefix && count <= limit, count, resetAt: new Date() };
});

const sendWhatsAppTemplate = vi.fn<(send: WhatsAppTemplateSend) => Promise<{ status: 'SENT' }>>(async () => ({ status: 'SENT' }));

vi.mock('@/lib/db/repositories/phoneCodes', () => ({ phoneCodesRepository }));
vi.mock('@/lib/db/repositories/rateLimits', () => ({ rateLimitsRepository: { hit } }));
vi.mock('@/lib/config/settings', () => ({
  getSettings: async () => ({ codesPerPhonePerDay: 5, codesPerTagPerDay: 5, codesPerIpPerHour: 20, codesPerDay: 500 }),
}));
vi.mock('@/lib/notifications/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications/whatsapp')>()),
  sendWhatsAppTemplate,
}));

const { checkCode, codesAvailable, issueCode, resendCode } = await import('@/lib/auth/codes');

const PHONE = '0550123456';
const configure = () => {
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'token');
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
  vi.stubEnv('WHATSAPP_CODE_TEMPLATE_NAME', 'autolink_code');
};
/** Issues and delivers a code, and returns it as the owner would read it on WhatsApp. */
async function issued(extra: { decoy?: boolean } = {}) {
  const result = await issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1', ...extra });
  if (!result.ok) throw new Error(result.reason);
  await result.deliver();
  const code = sendWhatsAppTemplate.mock.lastCall?.[0].body[0] ?? '';
  return { challengeId: result.challengeId, code };
}

beforeEach(() => {
  vi.clearAllMocks();
  rows.clear();
  counts.clear();
  refuse.clear();
  vi.stubEnv('PIN_SECRET', 'a-test-secret-that-is-long-enough-1234');
  vi.stubEnv('IP_HASH_SALT', 'a-test-salt');
  configure();
});
afterEach(() => vi.unstubAllEnvs());

describe('issueCode', () => {
  it('sends 6 digits through the code template, in its text and its copy button', async () => {
    const { challengeId, code } = await issued();
    expect(challengeId).toMatch(/^CHL-[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(code).toMatch(/^\d{6}$/);
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith({ template: 'autolink_code', to: PHONE, body: [code], buttonSuffix: code });
  });

  it('stores only a digest of the code', async () => {
    const { challengeId, code } = await issued();
    const stored = rows.get(challengeId)!;
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(code);
  });

  it('counts the number, the address, the daily total — and the sticker when there is one', async () => {
    await issueCode({ phone: PHONE, purpose: 'ACTIVATE', ipHash: 'ip-1', tagId: 'AUT-ABCDEFGH' });
    const keys = hit.mock.calls.map(([key]) => key);
    expect(keys.some((k) => k.startsWith('code:phone:'))).toBe(true);
    expect(keys).toEqual(expect.arrayContaining(['code:ip:ip-1', 'code:all', 'code:tag:AUT-ABCDEFGH']));
    expect(keys.join(' ')).not.toContain(PHONE);
  });

  it('sends nothing once a limit is spent', async () => {
    refuse.add('code:all');
    await expect(issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1' })).resolves.toEqual({ ok: false, reason: 'rate_limited' });
    expect(phoneCodesRepository.create).not.toHaveBeenCalled();
  });

  it('never sends a decoy, which still looks like a real challenge', async () => {
    const result = await issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1', decoy: true });
    expect(result.ok).toBe(true);
    if (result.ok) await result.deliver();
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('prints the code outside production when the template is not set up', async () => {
    vi.stubEnv('WHATSAPP_CODE_TEMPLATE_NAME', '');
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const result = await issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1' });
    if (result.ok) await expect(result.deliver()).resolves.toBe(true);
    expect(info.mock.calls[0]?.[0]).toMatch(/code for …56: \d{6}$/);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('is unavailable in production without the template — never skipped', async () => {
    vi.stubEnv('WHATSAPP_CODE_TEMPLATE_NAME', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(codesAvailable()).toBe(false);
    await expect(issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1' })).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('checkCode', () => {
  it('proves the phone with the right code, once', async () => {
    const { challengeId, code } = await issued();
    await expect(checkCode(challengeId, 'RESET_PIN', code)).resolves.toEqual({
      ok: true,
      challenge: { phone: PHONE, tagId: null, details: null, decoy: false },
    });
    await expect(checkCode(challengeId, 'RESET_PIN', code)).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts the code typed with Arabic digits or spaces', async () => {
    const { challengeId, code } = await issued();
    const arabic = code.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    await expect(checkCode(challengeId, 'RESET_PIN', ` ${arabic} `)).resolves.toMatchObject({ ok: true });
  });

  it('refuses a wrong code, and gives up after 5 tries', async () => {
    const { challengeId, code } = await issued();
    const wrong = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i++) {
      await expect(checkCode(challengeId, 'RESET_PIN', wrong)).resolves.toEqual({ ok: false, reason: 'invalid' });
    }
    await expect(checkCode(challengeId, 'RESET_PIN', code)).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('never lets a reset challenge finish an activation', async () => {
    const { challengeId, code } = await issued();
    await expect(checkCode(challengeId, 'ACTIVATE', code)).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('never verifies a decoy, whatever is typed', async () => {
    const result = await issueCode({ phone: PHONE, purpose: 'RESET_PIN', ipHash: 'ip-1', decoy: true });
    if (!result.ok) throw new Error('not issued');
    const stored = rows.get(result.challengeId)!;
    stored.codeHash = 'f'.repeat(64);
    await expect(checkCode(result.challengeId, 'RESET_PIN', '123456')).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('does not spend a try on something that is not a code', async () => {
    const { challengeId } = await issued();
    await expect(checkCode(challengeId, 'RESET_PIN', '12ab')).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(phoneCodesRepository.spendAttempt).not.toHaveBeenCalled();
  });

  it('refuses an expired code', async () => {
    const { challengeId, code } = await issued();
    rows.get(challengeId)!.expiresAt = new Date(Date.now() - 1000);
    await expect(checkCode(challengeId, 'RESET_PIN', code)).resolves.toEqual({ ok: false, reason: 'expired' });
  });
});

describe('resendCode', () => {
  it('waits a minute after a send', async () => {
    const { challengeId } = await issued();
    await expect(resendCode(challengeId, 'RESET_PIN', 'ip-1')).resolves.toEqual({ ok: false, reason: 'too_soon' });
  });

  it('then sends a new code that replaces the old one', async () => {
    const { challengeId, code: first } = await issued();
    counts.clear();
    const result = await resendCode(challengeId, 'RESET_PIN', 'ip-1');
    if (!result.ok) throw new Error(result.reason);
    await result.deliver();
    const second = sendWhatsAppTemplate.mock.lastCall![0].body[0]!;
    if (second !== first) {
      await expect(checkCode(challengeId, 'RESET_PIN', first)).resolves.toEqual({ ok: false, reason: 'invalid' });
    }
    await expect(checkCode(challengeId, 'RESET_PIN', second)).resolves.toMatchObject({ ok: true });
  });

  it('refuses a challenge that is over', async () => {
    await expect(resendCode('CHL-UNKNOWN', 'RESET_PIN', 'ip-1')).resolves.toEqual({ ok: false, reason: 'expired' });
  });
});
