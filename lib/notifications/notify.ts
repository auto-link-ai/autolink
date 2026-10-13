import 'server-only';
import { locales, type Locale } from '@/i18n/locales';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import type { MessageCategory } from '@/lib/domain/constants';
import { sendPush } from './push';
import { sendWhatsAppTemplate, templateText, whatsAppTemplateLanguage } from './whatsapp';

type NotificationMessage = NonNullable<Awaited<ReturnType<typeof messagesRepository.findForNotification>>>;

/**
 * Copy for a notification, read straight from the catalogue.
 *
 * Deliberately not `getTranslations`: this runs after the response has been
 * sent (and could later run from a cron or a queue), where next-intl's
 * request-scoped config does not exist. A plain import works anywhere.
 */
async function notificationCopy(locale: Locale) {
  const catalogue = (await import(`../../messages/${locale}.json`)).default as {
    notifications: {
      newMessage: { title: string; titleWithCar: string };
      care: { yourCar: string };
      whatsapp: { nameFallback: string };
    };
    scanner: { categories: Record<MessageCategory, string> };
  };
  return catalogue;
}

/**
 * Tells an owner that a message arrived: web push to their devices, and the
 * WhatsApp template to their number.
 *
 * Called from `after()`, so nothing here delays the person who scanned the
 * sticker, and a failure never loses the message — it is already stored and
 * waiting in their inbox. Each channel stands alone: one failing never stops
 * the other.
 */
export async function notifyOwnerOfMessage(messagePublicId: string): Promise<void> {
  try {
    const message = await messagesRepository.findForNotification(messagePublicId);
    if (!message) return;

    const results = await Promise.allSettled([
      pushOwner(messagePublicId, message),
      whatsAppOwner(messagePublicId, message),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[notify] failed:', result.reason instanceof Error ? result.reason.message : result.reason);
      }
    }
  } catch (error) {
    console.error('[notify] failed:', error instanceof Error ? error.message : error);
  }
}

/**
 * Names the car and the kind of problem; the words themselves stay behind the
 * dashboard, because a lock screen is a public place.
 */
async function pushOwner(messagePublicId: string, message: NotificationMessage): Promise<void> {
  const targets = await notificationSubscriptionsRepository.listForMessage(messagePublicId);
  if (targets.length === 0) return;

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
}

/**
 * The approved template: {{1}} the owner's name, {{2}} the car, {{3}} the kind
 * of problem and what was written; its button opens /alert/{publicId}. The
 * template has one language, so the copy follows it, not the owner's locale.
 */
async function whatsAppOwner(messagePublicId: string, message: NotificationMessage): Promise<void> {
  if (!message.ownerPhone) return;

  const language = whatsAppTemplateLanguage().slice(0, 2);
  const copy = await notificationCopy(locales.find((l) => l === language) ?? 'ar');
  const category = copy.scanner.categories[message.category];
  const written = message.body.trim();

  const result = await sendWhatsAppTemplate({
    to: message.ownerPhone,
    body: [
      templateText(message.ownerName ?? copy.notifications.whatsapp.nameFallback, 80),
      templateText(message.vehicleLabel ?? copy.notifications.care.yourCar, 120),
      // The whole template body must stay under 1024 characters.
      templateText(written ? `${category} — ${written}` : category, 600),
    ],
    buttonSuffix: messagePublicId,
  });

  if (result.status === 'SENT') await notificationAttemptsRepository.record(messagePublicId, 'WHATSAPP', 'SENT');
  if (result.status === 'FAILED') {
    await notificationAttemptsRepository.record(messagePublicId, 'WHATSAPP', 'FAILED', result.error);
  }
}
