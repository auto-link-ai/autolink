import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushOutcome, PushPayload } from '@/lib/notifications/push';
import type { PushTarget } from '@/lib/db/repositories/notificationSubscriptions';

const findForNotification = vi.fn();
const listForMessage = vi.fn();
const record = vi.fn(async () => undefined);
// Typed, so the assertions below can read what it was called with.
const sendPush = vi.fn<(targets: PushTarget[], payload: PushPayload) => Promise<PushOutcome>>();

vi.mock('@/lib/db/repositories/messages', () => ({ messagesRepository: { findForNotification } }));
vi.mock('@/lib/db/repositories/notificationSubscriptions', () => ({
  notificationSubscriptionsRepository: { listForMessage },
}));
vi.mock('@/lib/db/repositories/notificationAttempts', () => ({
  notificationAttemptsRepository: { record },
}));
vi.mock('@/lib/notifications/push', () => ({ sendPush }));

const { notifyOwnerOfMessage } = await import('@/lib/notifications/notify');

const TARGET = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
const BODY = 'Your lights are on, and my keys are under the mat.';

beforeEach(() => {
  vi.clearAllMocks();
  sendPush.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
  listForMessage.mockResolvedValue([TARGET]);
  findForNotification.mockResolvedValue({
    category: 'LIGHTS_ON',
    vehicleLabel: 'Peugeot 208 · Blue',
    locale: 'fr',
  });
});

describe('notifyOwnerOfMessage', () => {
  it('names the car and the kind of problem, in the owner’s language', async () => {
    await notifyOwnerOfMessage('MSG-0000000001');
    const payload = sendPush.mock.calls[0]![1];
    expect(payload.title).toBe('Message à propos de votre Peugeot 208 · Blue');
    expect(payload.body).toBe('Phares allumés');
    expect(payload.url).toBe('/fr/dashboard');
  });

  it('never puts what was written on the lock screen', async () => {
    findForNotification.mockResolvedValue({ category: 'URGENT', vehicleLabel: null, locale: 'en' });
    await notifyOwnerOfMessage('MSG-0000000001');
    const payload = sendPush.mock.calls[0]![1];
    expect(JSON.stringify(payload)).not.toContain(BODY);
    expect(JSON.stringify(payload)).not.toContain('keys are under the mat');
    // With no car to name it stays generic rather than guessing.
    expect(payload.title).toBe('New AutoLink message');
    expect(payload.body).toBe('Urgent');
  });

  it('speaks Arabic to an Arabic-speaking owner', async () => {
    findForNotification.mockResolvedValue({ category: 'BLOCKING_ACCESS', vehicleLabel: null, locale: 'ar' });
    await notifyOwnerOfMessage('MSG-0000000001');
    // Compared against the catalogue, so rewording the copy does not break this
    // — what is being checked is that the owner's own language was used.
    const ar = (await import('@/messages/ar.json')).default;
    expect(sendPush.mock.calls[0]![1].body).toBe(ar.scanner.categories.BLOCKING_ACCESS);
    expect(sendPush.mock.calls[0]![1].title).toBe(ar.notifications.newMessage.title);
  });

  it('does not send when the owner has no device, and records nothing', async () => {
    listForMessage.mockResolvedValue([]);
    await notifyOwnerOfMessage('MSG-0000000001');
    expect(sendPush).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
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
    expect(record).not.toHaveBeenCalled();
  });

  it('never throws — the message is already saved and waiting', async () => {
    findForNotification.mockRejectedValue(new Error('database gone'));
    await expect(notifyOwnerOfMessage('MSG-0000000001')).resolves.toBeUndefined();
  });
});
