import 'server-only';
import { locales, type Locale } from '@/i18n/locales';
import { addDays, algiersToday } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { careRemindersRepository, type DueReminder } from '@/lib/db/repositories/careReminders';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import type { CareDueKind } from '@/lib/domain/constants';
import { formatDay } from '@/lib/format/date';
import { sendPush } from '@/lib/notifications/push';
import { sendWhatsAppTemplate, templateText, whatsAppTemplateLanguage } from '@/lib/notifications/whatsapp';

const SYSTEM = { kind: 'system' } as const;

interface ReminderCopy {
  titles: Record<CareDueKind, string>;
  /** « votre voiture », for a car not described yet. */
  yourCar: string;
  dueOn: string;
  overdue: string;
}

interface Catalogue {
  notifications: { care: ReminderCopy; whatsapp: { nameFallback: string } };
  care: { due: { kinds: Record<CareDueKind, string> } };
}

/** Straight from the catalogue, as in lib/notifications/notify.ts: no request here. */
async function catalogue(locale: Locale): Promise<Catalogue> {
  return (await import(`../../messages/${locale}.json`)).default as Catalogue;
}

export function reminderText(copy: ReminderCopy, reminder: DueReminder, today: Date) {
  const date = formatDay(reminder.dueDate, reminder.locale);
  return {
    title: copy.titles[reminder.kind].replace('{car}', reminder.carLabel ?? copy.yourCar),
    body: (reminder.dueDate < today ? copy.overdue : copy.dueOn).replace('{date}', date),
  };
}

/**
 * The WhatsApp template's blanks, in the template's language: {{1}} the
 * owner's first name, {{2}} the car, {{3}} what is due and when — « التأمين —
 * الموعد: 16 أكتوبر 2026. ». Its button opens /alert/{sticker}, the car book.
 */
export function whatsAppReminderBody(copy: Catalogue, reminder: DueReminder, today: Date, locale: Locale): string[] {
  const care = copy.notifications.care;
  const when = (reminder.dueDate < today ? care.overdue : care.dueOn).replace('{date}', formatDay(reminder.dueDate, locale));
  return [
    templateText(reminder.firstName || copy.notifications.whatsapp.nameFallback, 80),
    templateText(reminder.carLabel ?? care.yourCar, 120),
    templateText(`${copy.care.due.kinds[reminder.kind]} — ${when}`, 300),
  ];
}

/** To every device of the owner. True once one took it. */
async function pushReminder(reminder: DueReminder, today: Date): Promise<boolean> {
  const targets = await notificationSubscriptionsRepository.listForUser(SYSTEM, reminder.userId);
  if (targets.length === 0) return false;
  const text = reminderText((await catalogue(reminder.locale)).notifications.care, reminder, today);
  const outcome = await sendPush(targets, { ...text, url: `/${reminder.locale}/dashboard/car/${reminder.publicTagId}` });
  if (outcome.skipped) return false;
  await notificationAttemptsRepository.recordOther(SYSTEM, {
    purpose: 'REMINDER',
    userId: reminder.userId,
    channel: 'PUSH',
    status: outcome.sent > 0 ? 'SENT' : 'FAILED',
    error: outcome.failed > 0 ? `${outcome.failed} device(s)` : null,
  });
  return outcome.sent > 0;
}

/** On WhatsApp — only when the owner switched reminders on. True once WhatsApp accepted it. */
async function whatsAppReminder(reminder: DueReminder, today: Date): Promise<boolean> {
  if (!reminder.whatsappReminders || !reminder.phone) return false;
  const language = whatsAppTemplateLanguage().slice(0, 2);
  const locale = locales.find((code) => code === language) ?? 'ar';
  const result = await sendWhatsAppTemplate({
    // A dedicated reminder template if there is one; otherwise the alert template fits.
    template: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME?.trim() || undefined,
    to: reminder.phone,
    body: whatsAppReminderBody(await catalogue(locale), reminder, today, locale),
    buttonSuffix: reminder.publicTagId,
  });
  if (result.status === 'SKIPPED') return false;
  await notificationAttemptsRepository.recordOther(SYSTEM, {
    purpose: 'REMINDER',
    userId: reminder.userId,
    channel: 'WHATSAPP',
    status: result.status,
    error: result.status === 'FAILED' ? result.error : null,
  });
  return result.status === 'SENT';
}

/**
 * The daily car book check: everything due within `careReminderDays` — or late
 * by no more than `careOverdueDays` — that has not been reminded for that date
 * gets one push to the owner's devices and, if they switched it on, one
 * WhatsApp message. The date counts as reminded once either went out: an
 * owner with neither is tried again the next day, so turning one on later
 * still tells them.
 */
export async function sendDueCareReminders(now: Date = new Date()): Promise<{ due: number; sent: number }> {
  const settings = await getSettings();
  const today = algiersToday(now);
  const due = await careRemindersRepository.findDue(
    SYSTEM,
    addDays(today, settings.careReminderDays),
    addDays(today, -settings.careOverdueDays),
  );

  let sent = 0;
  for (const reminder of due) {
    // Settled one by one: a push failure must not hide a WhatsApp message that
    // went out, or tomorrow would send it — and pay for it — again.
    const outcomes = await Promise.allSettled([pushReminder(reminder, today), whatsAppReminder(reminder, today)]);
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        console.error('[care] reminder failed:', outcome.reason instanceof Error ? outcome.reason.message : outcome.reason);
      }
    }
    if (!outcomes.some((outcome) => outcome.status === 'fulfilled' && outcome.value)) continue;
    try {
      await careRemindersRepository.markReminded(SYSTEM, reminder);
      sent++;
    } catch (error) {
      // One owner's failure never stops the others.
      console.error('[care] marking a reminder failed:', error instanceof Error ? error.message : error);
    }
  }
  return { due: due.length, sent };
}
