import 'server-only';
import { createTranslator } from 'next-intl';
import { locales, type Locale } from '@/i18n/locales';
import { getSettings, type AppSettings } from '@/lib/config/settings';
import { addDays } from '@/lib/care/due';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { renewalWarningsRepository, type DueRenewalWarning } from '@/lib/db/repositories/renewalWarnings';
import { formatDzd } from '@/lib/format/currency';
import { formatAlgiersDay } from '@/lib/format/date';
import { sendWhatsAppTemplate, templateText, whatsAppTemplateLanguage } from '@/lib/notifications/whatsapp';
import { periodParts } from './period';

const SYSTEM = { kind: 'system' } as const;

/**
 * What the WhatsApp button carries. Not a sticker id, so /alert/{id} opens the
 * dashboard (lib/notifications/alertTarget.ts), where the Renew button is.
 */
export const RENEW_BUTTON_SUFFIX = 'renew';

type Catalogue = typeof import('../../messages/fr.json');

/** Straight from the catalogue, as in lib/care/reminders.ts: no request here. */
async function catalogue(locale: Locale): Promise<Catalogue> {
  return (await import(`../../messages/${locale}.json`)).default as Catalogue;
}

/**
 * The reminder template's blanks, in the template's language: {{1}} the
 * owner's first name, {{2}} the car, {{3}} « Autocollant AutoLink — se termine
 * le 12 mars 2028. Renouvellement : 1 000 DA pour 1 an. »
 */
export function whatsAppRenewalBody(
  messages: Catalogue,
  locale: Locale,
  warning: DueRenewalWarning,
  settings: Pick<AppSettings, 'renewalPriceDzd' | 'renewalPeriodMonths' | 'currencyLabel'>,
): string[] {
  const t = createTranslator({ locale, messages });
  const text = t('notifications.renewal.whatsapp', {
    date: formatAlgiersDay(warning.serviceUntil, locale),
    price: formatDzd(settings.renewalPriceDzd, settings.currencyLabel),
    period: t('common.period', periodParts(settings.renewalPeriodMonths)),
  });
  return [
    templateText(warning.firstName || t('notifications.whatsapp.nameFallback'), 80),
    templateText(warning.carLabel ?? t('notifications.care.yourCar'), 120),
    templateText(text, 300),
  ];
}

/**
 * The daily check: every live sticker whose service ends within
 * `renewalWarningDays`, with no renewal waiting, gets one WhatsApp message to
 * its owner — once per end date, whatever the car book reminder switch says:
 * it is about the service they paid for. It goes on the reminder template, so
 * no other template needs approving. A send WhatsApp did not take is tried
 * again the next day.
 */
export async function sendRenewalWarnings(now: Date = new Date()): Promise<{ due: number; sent: number }> {
  const settings = await getSettings();
  const due = await renewalWarningsRepository.findDue(SYSTEM, now, addDays(now, settings.renewalWarningDays));
  const language = whatsAppTemplateLanguage().slice(0, 2);
  const locale = locales.find((code) => code === language) ?? 'ar';
  const messages = await catalogue(locale);

  let sent = 0;
  for (const warning of due) {
    try {
      const result = await sendWhatsAppTemplate({
        // A dedicated reminder template if there is one; otherwise the alert template fits.
        template: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME?.trim() || undefined,
        to: warning.phone,
        body: whatsAppRenewalBody(messages, locale, warning, settings),
        buttonSuffix: RENEW_BUTTON_SUFFIX,
      });
      if (result.status === 'SKIPPED') continue;
      await notificationAttemptsRepository.recordOther(SYSTEM, {
        purpose: 'REMINDER',
        userId: warning.userId,
        channel: 'WHATSAPP',
        status: result.status,
        error: result.status === 'FAILED' ? result.error : null,
      });
      if (result.status !== 'SENT') continue;
      await renewalWarningsRepository.markWarned(SYSTEM, warning);
      sent++;
    } catch (error) {
      // One owner's failure never stops the others.
      console.error('[renewal] warning failed:', error instanceof Error ? error.message : error);
    }
  }
  return { due: due.length, sent };
}
