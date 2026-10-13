import { getTranslations } from 'next-intl/server';
import { StatCard } from '@/components/admin/StatCard';
import { ClockIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from '@/components/site/icons';

/**
 * « À faire »: the four things that mean someone is waiting on the shop —
 * an order to confirm, an order to send, a stopped message to review, a
 * WhatsApp message that did not go. Orange when there is work.
 */
export async function TodoCards({
  locale,
  pending,
  toShip,
  blocked,
  whatsappFailedToday,
}: {
  locale: string;
  pending: number;
  toShip: number;
  blocked: number;
  whatsappFailedToday: number;
}) {
  const t = await getTranslations('admin.overview.todo');
  return (
    <section aria-labelledby="todo">
      <h2 id="todo" className="mb-3 text-h3 text-text">
        {t('title')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('pending')}
          value={pending}
          hint={t('pendingHint')}
          href={`/${locale}/admin/orders?status=PENDING`}
          icon={ClockIcon}
          urgent={pending > 0}
        />
        <StatCard
          label={t('toShip')}
          value={toShip}
          hint={t('toShipHint')}
          // Confirmed and in preparation: two statuses, so the whole list, whose pills count both.
          href={`/${locale}/admin/orders`}
          icon={TruckIcon}
          urgent={toShip > 0}
        />
        <StatCard
          label={t('blocked')}
          value={blocked}
          hint={t('blockedHint')}
          href={`/${locale}/admin/blocked`}
          icon={ShieldIcon}
          urgent={blocked > 0}
        />
        <StatCard
          label={t('whatsappFailed')}
          value={whatsappFailedToday}
          hint={t('whatsappFailedHint')}
          icon={WhatsAppIcon}
          urgent={whatsappFailedToday > 0}
        />
      </div>
    </section>
  );
}
