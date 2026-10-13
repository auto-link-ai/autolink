import { getTranslations } from 'next-intl/server';
import { StatCard } from '@/components/admin/StatCard';
import { CashIcon, QrIcon, StickerIcon, WhatsAppIcon } from '@/components/site/icons';
import { formatDzd } from '@/lib/format/currency';

/** Below this many printed, unassigned stickers, the stock card asks for a new batch. */
const LOW_STOCK = 20;

/**
 * « Ces 7 derniers jours »: how the shop is doing — orders and what they are
 * worth, stickers activated, WhatsApp messages accepted (alerts, reminders,
 * sign-in codes — each a paid message), and how many stickers are ready to
 * ship.
 */
export async function WeekCards({
  locale,
  orders,
  revenue,
  currencyLabel,
  activated,
  whatsapp,
  stock,
}: {
  locale: string;
  orders: number;
  revenue: number;
  currencyLabel: string;
  activated: number;
  whatsapp: { alerts: number; reminders: number; codes: number };
  stock: number;
}) {
  const t = await getTranslations('admin.overview.week');
  const low = stock < LOW_STOCK;
  return (
    <section aria-labelledby="week">
      <h2 id="week" className="mb-3 text-h3 text-text">
        {t('title')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('orders')}
          value={orders}
          hint={t('ordersHint', { revenue: formatDzd(revenue, currencyLabel) })}
          href={`/${locale}/admin/orders`}
          icon={CashIcon}
        />
        <StatCard
          label={t('activated')}
          value={activated}
          hint={t('activatedHint')}
          href={`/${locale}/admin/tags?status=ACTIVE`}
          icon={QrIcon}
        />
        <StatCard
          label={t('whatsapp')}
          value={whatsapp.alerts + whatsapp.reminders + whatsapp.codes}
          hint={t('whatsappHint', whatsapp)}
          icon={WhatsAppIcon}
        />
        <StatCard
          label={t('stock')}
          value={stock}
          hint={low ? t('stockLow') : t('stockHint')}
          href={`/${locale}/admin/tags?status=UNASSIGNED`}
          icon={StickerIcon}
          urgent={low}
        />
      </div>
    </section>
  );
}
