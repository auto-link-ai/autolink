import 'server-only';
import type { Locale } from '@/i18n/locales';
import { addDays, algiersToday } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { careRemindersRepository, type DueReminder } from '@/lib/db/repositories/careReminders';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import type { CareDueKind } from '@/lib/domain/constants';
import { formatDay } from '@/lib/format/date';
import { sendPush } from '@/lib/notifications/push';

const SYSTEM = { kind: 'system' } as const;

interface ReminderCopy {
  titles: Record<CareDueKind, string>;
  dueOn: string;
  overdue: string;
}

/** Straight from the catalogue, as in lib/notifications/notify.ts: no request here. */
async function reminderCopy(locale: Locale): Promise<ReminderCopy> {
  const catalogue = (await import(`../../messages/${locale}.json`)).default as {
    notifications: { care: ReminderCopy };
  };
  return catalogue.notifications.care;
}

export function reminderText(copy: ReminderCopy, reminder: DueReminder, today: Date) {
  const date = formatDay(reminder.dueDate, reminder.locale);
  return {
    title: copy.titles[reminder.kind].replace('{car}', reminder.carLabel),
    body: (reminder.dueDate < today ? copy.overdue : copy.dueOn).replace('{date}', date),
  };
}

/**
 * The daily car book check: everything due within `careReminderDays` (or
 * already late) that has not been reminded for that date gets one notification.
 * A reminder counts as done only once a device took it, so an owner who turns
 * notifications on later still hears about it.
 */
export async function sendDueCareReminders(now: Date = new Date()): Promise<{ due: number; sent: number }> {
  const settings = await getSettings();
  const today = algiersToday(now);
  const due = await careRemindersRepository.findDue(SYSTEM, addDays(today, settings.careReminderDays));

  let sent = 0;
  for (const reminder of due) {
    try {
      const targets = await notificationSubscriptionsRepository.listForUser(SYSTEM, reminder.userId);
      if (targets.length === 0) continue;

      const text = reminderText(await reminderCopy(reminder.locale), reminder, today);
      const outcome = await sendPush(targets, { ...text, url: `/${reminder.locale}/dashboard/car/${reminder.publicTagId}` });
      if (outcome.sent > 0) {
        await careRemindersRepository.markReminded(SYSTEM, reminder);
        sent++;
      }
    } catch (error) {
      // One owner's failure never stops the others.
      console.error('[care] reminder failed:', error instanceof Error ? error.message : error);
    }
  }
  return { due: due.length, sent };
}
