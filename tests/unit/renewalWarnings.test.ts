import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DueRenewalWarning } from '@/lib/db/repositories/renewalWarnings';
import type { WhatsAppResult, WhatsAppTemplateSend } from '@/lib/notifications/whatsapp';

const findDue = vi.fn<(system: unknown, now: Date, horizon: Date) => Promise<DueRenewalWarning[]>>();
const markWarned = vi.fn(async () => undefined);
type Attempt = { purpose: string; userId: string | null; channel: string; status: string; error?: string | null };
const recordOther = vi.fn<(system: unknown, attempt: Attempt) => Promise<void>>(async () => undefined);
const sendWhatsAppTemplate = vi.fn<(send: WhatsAppTemplateSend) => Promise<WhatsAppResult>>();

const SETTINGS = { renewalWarningDays: 30, renewalPriceDzd: 1000, renewalPeriodMonths: 12, currencyLabel: 'DA' };
vi.mock('@/lib/config/settings', () => ({ getSettings: async () => SETTINGS }));
vi.mock('@/lib/db/repositories/renewalWarnings', () => ({ renewalWarningsRepository: { findDue, markWarned } }));
vi.mock('@/lib/db/repositories/notificationAttempts', () => ({ notificationAttemptsRepository: { recordOther } }));
vi.mock('@/lib/notifications/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications/whatsapp')>()),
  sendWhatsAppTemplate,
}));

const { sendRenewalWarnings, whatsAppRenewalBody, RENEW_BUTTON_SUFFIX } = await import('@/lib/renewals/warnings');
const { alertTarget } = await import('@/lib/notifications/alertTarget');
const messages = {
  fr: (await import('@/messages/fr.json')).default,
  en: (await import('@/messages/en.json')).default,
  ar: (await import('@/messages/ar.json')).default,
};

// 08:00 in Algiers on 14 October 2026; the service ends late on 12 November.
const NOW = new Date('2026-10-14T07:00:00Z');
const WARNING: DueRenewalWarning = {
  ref: {} as DueRenewalWarning['ref'],
  userId: 'u1',
  locale: 'fr',
  phone: '0550123456',
  firstName: 'Sara',
  publicTagId: 'AUT-7K3M9QXZ',
  carLabel: 'Hyundai Accent',
  // 23:30 in Algiers: the owner's calendar day is the 12th, not UTC's.
  serviceUntil: new Date('2026-11-12T22:30:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  findDue.mockResolvedValue([WARNING]);
  sendWhatsAppTemplate.mockResolvedValue({ status: 'SENT' });
});
afterEach(() => vi.unstubAllEnvs());

describe('whatsAppRenewalBody: the reminder template blanks', () => {
  it('names the owner, the car, the end date in Algeria, and the renewal offer — in French', () => {
    const [name, car, text] = whatsAppRenewalBody(messages.fr, 'fr', WARNING, SETTINGS);
    expect(name).toBe('Sara');
    expect(car).toBe('Hyundai Accent');
    expect(text).toContain('12 nov');
    // WhatsApp variables are flattened: the price's non-breaking spaces become plain ones.
    expect(text).toContain('1 000 DA pour 1 an');
  });

  it('in English and Arabic, with Arabic plural forms for the length', () => {
    expect(whatsAppRenewalBody(messages.en, 'en', WARNING, SETTINGS)[2]).toContain('1 000 DA for 1 year');
    expect(whatsAppRenewalBody(messages.ar, 'ar', WARNING, SETTINGS)[2]).toContain('لمدة سنة واحدة');
    expect(whatsAppRenewalBody(messages.ar, 'ar', WARNING, { ...SETTINGS, renewalPeriodMonths: 24 })[2]).toContain('سنتين');
  });

  it('falls back to words when the owner has no first name or the car is not described', () => {
    const [name, car] = whatsAppRenewalBody(messages.fr, 'fr', { ...WARNING, firstName: '', carLabel: null }, SETTINGS);
    expect(name).toBe(messages.fr.notifications.whatsapp.nameFallback);
    expect(car).toBe(messages.fr.notifications.care.yourCar);
  });
});

describe('sendRenewalWarnings', () => {
  it('looks ahead by renewalWarningDays from now', async () => {
    await sendRenewalWarnings(NOW);
    const [, now, horizon] = findDue.mock.calls[0]!;
    expect(now).toBe(NOW);
    expect(horizon.toISOString()).toBe('2026-11-13T07:00:00.000Z');
  });

  it('sends one WhatsApp per due sticker, whose button opens the dashboard, and marks it', async () => {
    await expect(sendRenewalWarnings(NOW)).resolves.toEqual({ due: 1, sent: 1 });
    const send = sendWhatsAppTemplate.mock.calls[0]![0];
    expect(send.to).toBe('0550123456');
    expect(send.body).toHaveLength(3);
    expect(send.buttonSuffix).toBe(RENEW_BUTTON_SUFFIX);
    expect(alertTarget('ar', RENEW_BUTTON_SUFFIX)).toBe('/ar/dashboard');
    expect(markWarned).toHaveBeenCalledWith({ kind: 'system' }, WARNING);
    expect(recordOther.mock.calls[0]![1]).toMatchObject({ purpose: 'REMINDER', channel: 'WHATSAPP', status: 'SENT' });
  });

  it('goes on the reminder template when one is set', async () => {
    vi.stubEnv('WHATSAPP_REMINDER_TEMPLATE_NAME', 'autolink_rappel');
    await sendRenewalWarnings(NOW);
    expect(sendWhatsAppTemplate.mock.calls[0]![0].template).toBe('autolink_rappel');
  });

  it('does not mark a send WhatsApp refused, so it is tried again tomorrow', async () => {
    sendWhatsAppTemplate.mockResolvedValue({ status: 'FAILED', error: 'HTTP 400 #131026' });
    await expect(sendRenewalWarnings(NOW)).resolves.toEqual({ due: 1, sent: 0 });
    expect(markWarned).not.toHaveBeenCalled();
    expect(recordOther.mock.calls[0]![1]).toMatchObject({ status: 'FAILED', error: 'HTTP 400 #131026' });
  });

  it('records and marks nothing while WhatsApp is not set up', async () => {
    sendWhatsAppTemplate.mockResolvedValue({ status: 'SKIPPED', reason: 'not configured' });
    await expect(sendRenewalWarnings(NOW)).resolves.toEqual({ due: 1, sent: 0 });
    expect(recordOther).not.toHaveBeenCalled();
    expect(markWarned).not.toHaveBeenCalled();
  });

  it("one owner's failure never stops the others", async () => {
    findDue.mockResolvedValue([WARNING, { ...WARNING, userId: 'u2', phone: '0660123456' }]);
    sendWhatsAppTemplate.mockRejectedValueOnce(new Error('network down'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(sendRenewalWarnings(NOW)).resolves.toEqual({ due: 2, sent: 1 });
    expect(markWarned).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
