import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { codesConfigured } from '@/lib/auth/codes';
import { addDays, algiersDayStart } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { missingSiteDetails } from '@/lib/config/site';
import { getWilayas } from '@/lib/config/wilayas';
import { blockedMessagesRepository } from '@/lib/db/repositories/blockedMessages';
import { notificationAttemptsRepository } from '@/lib/db/repositories/notificationAttempts';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { adminRenewalsRepository } from '@/lib/db/repositories/renewalsAdmin';
import { tagsRepository } from '@/lib/db/repositories/tags';
import type { NotificationPurpose } from '@/lib/domain/constants';
import { OrderQueue } from './_overview/OrderQueue';
import { RecentActivations } from './_overview/RecentActivations';
import { TodoCards } from './_overview/TodoCards';
import { WeekCards } from './_overview/WeekCards';

type Props = { params: Promise<{ locale: string }> };

const QUEUE_SIZE = 6;
const FEED_SIZE = 6;

type Counts = Awaited<ReturnType<typeof notificationAttemptsRepository.counts>>;
const whatsApp = (rows: Counts, status: 'SENT' | 'FAILED', purpose?: NotificationPurpose) =>
  rows
    .filter((row) => row.channel === 'WHATSAPP' && row.status === status && (!purpose || row.purpose === purpose))
    .reduce((total, row) => total + row.count, 0);

/**
 * The admin's first screen, in three blocks: what is waiting on the shop now,
 * how the last seven days went, and who just activated a sticker. Plain
 * numbers and lists — no chart library (stack rule). Every number links to
 * where it can be acted on.
 */
export default async function AdminOverviewPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { actor } = await requireAdmin(locale);
  const t = await getTranslations('admin.overview');

  const today = algiersDayStart();
  const weekStart = addDays(today, -6);
  const [orders, tags, blocked, queue, week, activated, activations, sentToday, sentWeek, settings, wilayas, renewals] = await Promise.all([
    adminOrdersRepository.countByStatus(actor),
    tagsRepository.countByStatus(actor),
    blockedMessagesRepository.count(actor),
    adminOrdersRepository.queue(actor, QUEUE_SIZE),
    adminOrdersRepository.takenSince(actor, weekStart),
    tagsRepository.activatedSince(actor, weekStart),
    tagsRepository.recentlyActivated(actor, FEED_SIZE),
    notificationAttemptsRepository.counts(actor, today),
    notificationAttemptsRepository.counts(actor, weekStart),
    getSettings(),
    getWilayas(),
    adminRenewalsRepository.countPending(actor),
  ]);

  const wilayaName = (code: number) => {
    const w = wilayas.find((x) => x.code === code);
    return w ? (locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr) : String(code);
  };
  // Customers never see a placeholder, so this is the one place it shows up.
  const missing = missingSiteDetails();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 text-text-secondary">{t('subtitle')}</p>
      </div>

      {!codesConfigured() && (
        <div role="note" className="rounded-md border border-danger/40 bg-danger/5 px-5 py-4">
          <p className="font-bold text-text">{t('codesOff.title')}</p>
          <p className="mt-1 text-sm text-text-secondary">{t('codesOff.body')}</p>
        </div>
      )}
      {missing.length > 0 && (
        <div role="note" className="rounded-md border border-accent/40 bg-accent-soft px-5 py-4">
          <p className="font-bold text-text">{t('placeholders.title')}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {t('placeholders.body', { fields: missing.map((key) => t(`placeholders.fields.${key}`)).join(', ') })}
          </p>
          <p dir="ltr" className="mt-2 font-mono text-xs text-text-muted">
            lib/config/site.ts
          </p>
        </div>
      )}

      <TodoCards
        locale={locale}
        pending={orders.PENDING}
        toShip={orders.CONFIRMED + orders.PREPARING}
        renewals={renewals}
        blocked={blocked}
        whatsappFailedToday={whatsApp(sentToday, 'FAILED')}
      />
      <OrderQueue locale={locale} queue={queue} pendingTotal={orders.PENDING} wilayaName={wilayaName} />
      <WeekCards
        locale={locale}
        orders={week.count}
        revenue={week.revenue}
        currencyLabel={settings.currencyLabel}
        activated={activated}
        whatsapp={{
          alerts: whatsApp(sentWeek, 'SENT', 'MESSAGE'),
          reminders: whatsApp(sentWeek, 'SENT', 'REMINDER'),
          codes: whatsApp(sentWeek, 'SENT', 'CODE'),
        }}
        stock={tags.UNASSIGNED}
      />
      <p className="-mt-4 text-sm text-text-muted">{t('whatsappNote')}</p>
      <RecentActivations locale={locale} rows={activations} />
    </div>
  );
}
