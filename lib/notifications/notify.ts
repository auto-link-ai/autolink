import 'server-only';
import type { Locale } from '@/i18n/locales';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import type { MessageCategory } from '@/lib/domain/constants';
import { sendPush } from './push';

/**
 * Copy for a notification, read straight from the catalogue.
 *
 * Deliberately not `getTranslations`: this runs after the response has been
 * sent (and could later run from a cron or a queue), where next-intl's
 * request-scoped config does not exist. A plain import works anywhere.
 */
async function notificationCopy(locale: Locale) {
  const catalogue = (await import(`../../messages/${locale}.json`)).default as {
    notifications: { newMessage: { title: string; titleWithCar: string } };
    scanner: { categories: Record<MessageCategory, string> };
  };
  return catalogue;
}

/**
 * Tells an owner that a message arrived.
 *
 * Called from `after()`, so nothing here delays the person who scanned the
 * sticker, and a failure never loses the message — it is already stored and
 * waiting in their inbox. The notification names the car and the kind of
 * problem; the words themselves stay behind the dashboard, because a lock
 * screen is a public place.
 */
export async function notifyOwnerOfMessage(messagePublicId: string): Promise<void> {
  try {
    const [message, targets] = await Promise.all([
      messagesRepository.findForNotification(messagePublicId),
      notificationSubscriptionsRepository.listForMessage(messagePublicId),
    ]);
    if (!message || targets.length === 0) return;

    const copy = await notificationCopy(message.locale);
    const title = message.vehicleLabel
      ? copy.notifications.newMessage.titleWithCar.replace('{car}', message.vehicleLabel)
      : copy.notifications.newMessage.title;

    const outcome = await sendPush(targets, {
      title,
      body: copy.scanner.categories[message.category],
      url: `/${message.locale}/dashboard`,
    });
    if (outcome.skipped) return;

    if (outcome.sent > 0) await notificationAttemptsRepository.record(messagePublicId, 'PUSH', 'SENT');
    if (outcome.failed > 0) {
      await notificationAttemptsRepository.record(messagePublicId, 'PUSH', 'FAILED', `${outcome.failed} device(s)`);
    }
  } catch (error) {
    console.error('[notify] failed:', error instanceof Error ? error.message : error);
  }
}
