import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushOutcome, PushPayload } from '@/lib/notifications/push';
import type { WhatsAppResult, WhatsAppTemplateSend } from '@/lib/notifications/whatsapp';
import type { PushTarget } from '@/lib/db/repositories/notificationSubscriptions';

const findForNotification = vi.fn();
const listForMessage = vi.fn();
const record = vi.fn<(id: string, channel: string, status: string, error?: string | null) => Promise<void>>(
  async () => undefined,
);
// Typed, so the assertions below can read what it was called with.
const sendPush = vi.fn<(targets: PushTarget[], payload: PushPayload) => Promise<PushOutcome>>();
const sendWhatsAppTemplate = vi.fn<(send: WhatsAppTemplateSend) => Promise<WhatsAppResult>>();

vi.mock('@/lib/db/repositories/messages', () => ({ messagesRepository: { findForNotification } }));
vi.mock('@/lib/db/repositories/notificationSubscriptions', () => ({
  notificationSubscriptionsRepository: { listForMessage },
}));
vi.mock('@/lib/db/repositories/notificationAttempts', () => ({
  notificationAttemptsRepository: { record },
}));
vi.mock('@/lib/notifications/push', () => ({ sendPush }));
// Only the network call is replaced: text cleaning and the language are the real ones.
vi.mock('@/lib/notifications/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications/whatsapp')>()),
  sendWhatsAppTemplate,
}));

const { notifyOwnerOfMessage } = await import('@/lib/notifications/notify');
const ar = (await import('@/messages/ar.json')).default;

const TARGET = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
const BODY = 'Your lights are on, and my keys are under the mat.';
const MESSAGE = {
  category: 'LIGHTS_ON',
  vehicleLabel: 'Peugeot 208 · Blue',
  locale: 'fr',
  body: BODY,
  ownerName: 'Ahmed',
  ownerPhone: '0550123456',
};

/** What was recorded on one channel. */
const recorded = (channel: string) => record.mock.calls.filter((call) => call[1] === channel);
const whatsAppSend = () => sendWhatsAppTemplate.mock.calls[0]![0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  sendPush.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
  sendWhatsAppTemplate.mockResolvedValue({ status: 'SENT' });
  listForMessage.mockResolvedValue([TARGET]);
  findForNotification.mockResolvedValue(MESSAGE);
});

describe('notifyOwnerOfMessage — push', () => {
  it('names the car and the kind of problem, in the owner’s language', async () => {
    await notifyOwnerOfMessage('MSG-0000000001');
    const payload = sendPush.mock.calls[0]![1];
    expect(payload.title).toBe('Message à propos de votre Peugeot 208 · Blue');
    expect(payload.body).toBe('Phares allumés');
    expect(payload.url).toBe('/fr/dashboard');
  });

  it('never puts what was written on the lock screen', async () => {
    findForNotification.mockResolvedValue({ ...MESSAGE, category: 'URGENT', vehicleLabel: null, locale: 'en' });
    await notifyOwnerOfMessage('MSG-0000000001');
    const payload = sendPush.mock.calls[0]![1];
    expect(JSON.stringify(payload)).not.toContain(BODY);
    expect(JSON.stringify(payload)).not.toContain('keys are under the mat');
    // With no car to name it stays generic rather than guessing.
    expect(payload.title).toBe('New AutoLink message');
    expect(payload.body).toBe('Urgent');
  });

  it('speaks Arabic to an Arabic-speaking owner', async () => {
    findForNotification.mockResolvedValue({ ...MESSAGE, category: 'BLOCKING_ACCESS', vehicleLabel: null, locale: 'ar' });
    await notifyOwnerOfMessage('MSG-0000000001');
    // Compared against the catalogue, so rewording the copy does not break this
    // — what is being checked is that the owner's own language was used.
    expect(sendPush.mock.calls[0]![1].body).toBe(ar.scanner.categories.BLOCKING_ACCESS);
    expect(sendPush.mock.calls[0]![1].title).toBe(ar.notifications.newMessage.title);
  });

  it('does not push when the owner has no device, and records no push', async () => {
    listForMessage.mockResolvedValue([]);
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(sendPush).not.toHaveBeenCalled();
    expect(recorded('PUSH')).toHaveLength(0);
  });

  it('records what happened, so "I was never told" has an answer', async () => {
    sendPush.mockResolvedValue({ sent: 1, failed: 2, skipped: false });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(record).toHaveBeenCalledWith('MSG-0000000001', 'PUSH', 'SENT');
    expect(record).toHaveBeenCalledWith('MSG-0000000001', 'PUSH', 'FAILED', '2 device(s)');
  });

  it('stays quiet when push is not configured at all', async () => {
    sendPush.mockResolvedValue({ sent: 0, failed: 0, skipped: true });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(recorded('PUSH')).toHaveLength(0);
  });

  it('never throws — the message is already saved and waiting', async () => {
    findForNotification.mockRejectedValue(new Error('database gone'));
    await expect(notifyOwnerOfMessage('MSG-0000000001')).resolves.toBeUndefined();
  });
});

describe('notifyOwnerOfMessage — WhatsApp', () => {
  it('fills the Arabic template: name, car, kind of problem and what was written', async () => {
    // A French-speaking owner still gets the Arabic copy: the template is Arabic.
    await notifyOwnerOfMessage('MSG-0000000001');
    const send = whatsAppSend();
    expect(send.to).toBe('0550123456');
    expect(send.body).toEqual(['Ahmed', 'Peugeot 208 · Blue', `${ar.scanner.categories.LIGHTS_ON} — ${BODY}`]);
    // The button opens /alert/{publicId}.
    expect(send.buttonSuffix).toBe('MSG-0000000001');
  });

  it('follows WHATSAPP_TEMPLATE_LANGUAGE for its copy', async () => {
    vi.stubEnv('WHATSAPP_TEMPLATE_LANGUAGE', 'fr');
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(whatsAppSend().body[2]).toBe(`Phares allumés — ${BODY}`);
  });

  it('never sends an empty variable: older accounts and undescribed cars get a fallback', async () => {
    findForNotification.mockResolvedValue({ ...MESSAGE, ownerName: null, vehicleLabel: null, body: '  ' });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(whatsAppSend().body).toEqual([
      ar.notifications.whatsapp.nameFallback,
      ar.notifications.care.yourCar,
      ar.scanner.categories.LIGHTS_ON,
    ]);
  });

  it('flattens line breaks and keeps a long message within the template limit', async () => {
    findForNotification.mockResolvedValue({ ...MESSAGE, body: `First line\n\nsecond\tline ${'x'.repeat(2000)}` });
    await notifyOwnerOfMessage('MSG-0000000001');
    const third = whatsAppSend().body[2]!;
    expect(third).not.toMatch(/[\n\t]| {4}/);
    expect(third).toContain('First line second line');
    expect(third.length).toBeLessThanOrEqual(600);
  });

  it('still reaches an owner who never turned push on', async () => {
    listForMessage.mockResolvedValue([]);
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(sendWhatsAppTemplate).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith('MSG-0000000001', 'WHATSAPP', 'SENT');
  });

  it('does not send without a number, and records nothing', async () => {
    findForNotification.mockResolvedValue({ ...MESSAGE, ownerPhone: null });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
    expect(recorded('WHATSAPP')).toHaveLength(0);
  });

  it('records a failure with its reason, and nothing when WhatsApp is not configured', async () => {
    sendWhatsAppTemplate.mockResolvedValueOnce({ status: 'FAILED', error: 'whatsapp 400 #132000' });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(record).toHaveBeenCalledWith('MSG-0000000001', 'WHATSAPP', 'FAILED', 'whatsapp 400 #132000');

    record.mockClear();
    sendWhatsAppTemplate.mockResolvedValueOnce({ status: 'SKIPPED', reason: 'not_configured' });
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(recorded('WHATSAPP')).toHaveLength(0);
  });

  it('a WhatsApp crash never stops the push', async () => {
    sendWhatsAppTemplate.mockRejectedValue(new Error('network down'));
    await expect(notifyOwnerOfMessage('MSG-0000000001')).resolves.toBeUndefined();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith('MSG-0000000001', 'PUSH', 'SENT');
  });
});
