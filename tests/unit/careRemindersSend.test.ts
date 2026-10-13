import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DueReminder } from '@/lib/db/repositories/careReminders';
import type { PushOutcome } from '@/lib/notifications/push';
import type { WhatsAppResult, WhatsAppTemplateSend } from '@/lib/notifications/whatsapp';

const findDue = vi.fn<(system: unknown, horizon: Date, oldest: Date) => Promise<DueReminder[]>>();
const markReminded = vi.fn(async () => undefined);
const listForUser = vi.fn();
type Attempt = { purpose: string; userId: string | null; channel: string; status: string; error?: string | null };
const recordOther = vi.fn<(system: unknown, attempt: Attempt) => Promise<void>>(async () => undefined);
const sendPush = vi.fn<() => Promise<PushOutcome>>();
const sendWhatsAppTemplate = vi.fn<(send: WhatsAppTemplateSend) => Promise<WhatsAppResult>>();

vi.mock('@/lib/config/settings', () => ({ getSettings: async () => ({ careReminderDays: 7, careOverdueDays: 30 }) }));
vi.mock('@/lib/db/repositories/careReminders', () => ({ careRemindersRepository: { findDue, markReminded } }));
vi.mock('@/lib/db/repositories/notificationSubscriptions', () => ({ notificationSubscriptionsRepository: { listForUser } }));
vi.mock('@/lib/db/repositories/notificationAttempts', () => ({ notificationAttemptsRepository: { recordOther } }));
vi.mock('@/lib/notifications/push', () => ({ sendPush }));
vi.mock('@/lib/notifications/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications/whatsapp')>()),
  sendWhatsAppTemplate,
}));

const { sendDueCareReminders } = await import('@/lib/care/reminders');
const ar = (await import('@/messages/ar.json')).default;

// 08:00 in Algiers on 13 October 2026; the insurance runs out three days later.
const NOW = new Date('2026-10-13T07:00:00Z');
const DEVICE = { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } };
const REMINDER: DueReminder = {
  kind: 'INSURANCE',
  ref: {} as DueReminder['ref'],
  userId: 'u1',
  locale: 'fr',
  phone: '0550123456',
  firstName: 'Sara',
  whatsappReminders: true,
  publicTagId: 'AUT-7K3M9QXZ',
  carLabel: 'Hyundai Accent',
  dueDate: new Date('2026-10-16T00:00:00Z'),
};
const recorded = (channel: string) => recordOther.mock.calls.filter(([, attempt]) => attempt.channel === channel);

beforeEach(() => {
  vi.clearAllMocks();
  findDue.mockResolvedValue([REMINDER]);
  listForUser.mockResolvedValue([]);
  sendPush.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
  sendWhatsAppTemplate.mockResolvedValue({ status: 'SENT' });
});
afterEach(() => vi.unstubAllEnvs());

describe('sendDueCareReminders', () => {
  it('looks ahead by careReminderDays and back by no more than careOverdueDays', async () => {
    await sendDueCareReminders(NOW);
    const [, horizon, oldest] = findDue.mock.calls[0]!;
    expect(horizon.toISOString().slice(0, 10)).toBe('2026-10-20');
    expect(oldest.toISOString().slice(0, 10)).toBe('2026-09-13');
  });

  it('sends the WhatsApp template in its language: name, car, what is due and when — button to the car book', async () => {
    await expect(sendDueCareReminders(NOW)).resolves.toEqual({ due: 1, sent: 1 });
    const send = sendWhatsAppTemplate.mock.calls[0]![0];
    expect(send.to).toBe('0550123456');
    expect(send.body[0]).toBe('Sara');
    expect(send.body[1]).toBe('Hyundai Accent');
    expect(send.body[2]).toContain(ar.care.due.kinds.INSURANCE);
    expect(send.body[2]).toContain('2026');
    expect(send.buttonSuffix).toBe('AUT-7K3M9QXZ');
    expect(markReminded).toHaveBeenCalledOnce();
    expect(recorded('WHATSAPP')[0]![1]).toMatchObject({ purpose: 'REMINDER', userId: 'u1', status: 'SENT' });
  });

  it('uses a dedicated reminder template when one is set', async () => {
    vi.stubEnv('WHATSAPP_REMINDER_TEMPLATE_NAME', 'autolink_rappel');
    await sendDueCareReminders(NOW);
    expect(sendWhatsAppTemplate.mock.calls[0]![0].template).toBe('autolink_rappel');
  });

  it('sends no WhatsApp to an owner who left reminders off — push only', async () => {
    findDue.mockResolvedValue([{ ...REMINDER, whatsappReminders: false }]);
    listForUser.mockResolvedValue([DEVICE]);
    await expect(sendDueCareReminders(NOW)).resolves.toEqual({ due: 1, sent: 1 });
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalledOnce();
  });

  it('tells an owner on both channels, and marks the date once', async () => {
    listForUser.mockResolvedValue([DEVICE]);
    await sendDueCareReminders(NOW);
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendWhatsAppTemplate).toHaveBeenCalledOnce();
    expect(markReminded).toHaveBeenCalledOnce();
  });

  it('keeps the date for tomorrow when nothing reached the owner', async () => {
    findDue.mockResolvedValue([{ ...REMINDER, whatsappReminders: false }]);
    await expect(sendDueCareReminders(NOW)).resolves.toEqual({ due: 1, sent: 0 });
    expect(markReminded).not.toHaveBeenCalled();
  });

  it('records a refused WhatsApp send, and tries again tomorrow', async () => {
    sendWhatsAppTemplate.mockResolvedValue({ status: 'FAILED', error: 'whatsapp 400 #131026' });
    await expect(sendDueCareReminders(NOW)).resolves.toEqual({ due: 1, sent: 0 });
    expect(recorded('WHATSAPP')[0]![1]).toMatchObject({ status: 'FAILED', error: 'whatsapp 400 #131026' });
    expect(markReminded).not.toHaveBeenCalled();
  });

  it('never loses a WhatsApp message that went out because the push broke — no paid duplicate tomorrow', async () => {
    listForUser.mockRejectedValue(new Error('push store down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(sendDueCareReminders(NOW)).resolves.toEqual({ due: 1, sent: 1 });
    expect(markReminded).toHaveBeenCalledOnce();
  });

  it('falls back to a greeting and « your car » when there is no name or car yet', async () => {
    findDue.mockResolvedValue([{ ...REMINDER, firstName: '', carLabel: null }]);
    await sendDueCareReminders(NOW);
    const [name, car] = sendWhatsAppTemplate.mock.calls[0]![0].body;
    expect(name).toBe(ar.notifications.whatsapp.nameFallback);
    expect(car).toBe(ar.notifications.care.yourCar);
  });
});
