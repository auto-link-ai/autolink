import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { pushPublicKey } from '@/lib/notifications/push';
import { NotifyToggle } from './NotifyToggle';
import { RemindersCard } from './RemindersCard';

/**
 * How the owner hears about things: notifications in this browser, and the
 * car book's reminders on WhatsApp. (Messages from a sticker always reach
 * WhatsApp too; that one is not a setting.)
 */
export async function NotificationsSection({
  locale,
  phone,
  whatsappReminders,
  reminderDays,
}: {
  locale: Locale;
  phone: string;
  whatsappReminders: boolean;
  reminderDays: number;
}) {
  const t = await getTranslations('dashboard');
  const pushKey = pushPublicKey();

  return (
    <section id="reminders" aria-labelledby="notifications" className="mt-12 scroll-mt-28">
      <h2 id="notifications" className="mb-4 text-h3 text-text">
        {t('notificationsTitle')}
      </h2>
      <RemindersCard locale={locale} on={whatsappReminders} phone={phone} days={reminderDays} />
      {pushKey && (
        <NotifyToggle
          locale={locale}
          publicKey={pushKey}
          labels={{
            title: t('notify.title'),
            body: t('notify.body'),
            enable: t('notify.enable'),
            working: t('notify.working'),
            enabled: t('notify.enabled'),
            confirmFailed: t('notify.confirmFailed'),
            denied: t('notify.denied'),
            deniedHelp: t('notify.deniedHelp'),
            iosInstall: t('notify.iosInstall'),
            insecure: t('notify.insecure'),
            unsupported: t('notify.unsupported'),
            failed: t('notify.failed'),
          }}
        />
      )}
    </section>
  );
}
