import { getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { ClockIcon } from '@/components/site/icons';
import { Card } from '@/components/ui/Card';
import type { Locale } from '@/i18n/locales';
import { orderListSearch } from '@/lib/admin/orderListQuery';
import type { OrderDTO } from '@/lib/db/repositories/orders';
import { formatDzd } from '@/lib/format/currency';
import { formatAge } from '@/lib/format/date';

/** The orders waiting for their confirmation call, the one waiting longest first — one tap opens it. */
export async function OrderQueue({
  locale,
  queue,
  pendingTotal,
  wilayaName,
}: {
  locale: Locale;
  queue: OrderDTO[];
  pendingTotal: number;
  wilayaName: (code: number) => string;
}) {
  const t = await getTranslations('admin.overview.queue');
  const ordersPath = `/${locale}/admin/orders`;

  return (
    <Card
      title={t('title')}
      description={t('description')}
      actions={
        pendingTotal > queue.length ? (
          <NextLink href={`${ordersPath}?status=PENDING`} className="text-sm font-semibold text-accent hover:underline">
            {t('seeAll', { count: pendingTotal })}
          </NextLink>
        ) : undefined
      }
    >
      {queue.length === 0 ? (
        <p className="py-6 text-text-muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {queue.map((order) => (
            <li key={order.orderRef}>
              <NextLink
                href={`${ordersPath}${orderListSearch({ page: 1, ref: order.orderRef })}`}
                className="-mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm px-2 py-3 hover:bg-surface-2"
              >
                <span dir="ltr" className="font-mono text-sm font-semibold text-accent">
                  {order.orderRef}
                </span>
                <span className="text-sm text-text">{order.customerName}</span>
                <span className="text-sm text-text-secondary">{wilayaName(order.wilayaCode)}</span>
                <span dir="ltr" className="text-sm text-text-secondary">
                  {order.quantity} × {formatDzd(order.totalPrice)}
                </span>
                <span className="ms-auto inline-flex items-center gap-1.5 text-sm text-text-muted">
                  <ClockIcon className="h-4 w-4" />
                  {formatAge(order.createdAt, locale)}
                </span>
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
