import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { StatCard } from '@/components/admin/StatCard';
import { ClockIcon, QrIcon, StickerIcon, TruckIcon, UsersIcon } from '@/components/site/icons';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { orderListSearch } from '@/lib/admin/orderListQuery';
import { customerListSearch } from '@/lib/admin/customerListQuery';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { usersRepository } from '@/lib/db/repositories/users';
import { wilayasRepository } from '@/lib/db/repositories/wilayas';
import { ORDER_STATUSES, TAG_STATUSES } from '@/lib/domain/constants';
import { formatDzd } from '@/lib/format/currency';
import { formatAge } from '@/lib/format/date';

type Props = { params: Promise<{ locale: string }> };

const QUEUE_SIZE = 6;
const FEED_SIZE = 5;

/**
 * The dashboard answers "what do I have to do right now?" first, and only then
 * shows what exists. Plain numbers and lists — no chart library (stack rule).
 */
export default async function AdminOverviewPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin.overview');
  const tOrders = await getTranslations('admin.orders');
  const tTags = await getTranslations('admin.tags');

  const [orderCounts, tagCounts, customers, pendingOrders, activations, newCustomers, wilayas] =
    await Promise.all([
      adminOrdersRepository.countByStatus(session.actor),
      tagsRepository.countByStatus(session.actor),
      usersRepository.countSummary(session.actor),
      adminOrdersRepository.list(session.actor, { status: 'PENDING' }, 1),
      tagsRepository.recentlyActivated(session.actor, FEED_SIZE),
      usersRepository.listForAdmin(session.actor, {}, 1),
      wilayasRepository.list(),
    ]);

  const wilayaName = (code: number) => {
    const w = wilayas.find((x) => x.code === code);
    return w ? (locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr) : String(code);
  };

  const ordersPath = `/${locale}/admin/orders`;
  const customersPath = `/${locale}/admin/customers`;
  const queue = pendingOrders.items.slice(0, QUEUE_SIZE);
  const activated = tagCounts.ACTIVE + tagCounts.DEACTIVATED;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('cards.pending')}
          value={orderCounts.PENDING}
          hint={t('hints.pending')}
          href={`${ordersPath}?status=PENDING`}
          icon={TruckIcon}
          urgent={orderCounts.PENDING > 0}
        />
        <StatCard
          label={t('cards.unassigned')}
          value={tagCounts.UNASSIGNED}
          hint={t('hints.unassigned')}
          href={`/${locale}/admin/tags?status=UNASSIGNED`}
          icon={StickerIcon}
        />
        <StatCard
          label={t('cards.activated')}
          value={activated}
          hint={t('hints.activated')}
          href={`/${locale}/admin/tags?status=ACTIVE`}
          icon={QrIcon}
        />
        <StatCard
          label={t('cards.customers')}
          value={customers.total}
          hint={t('hints.customers')}
          href={customersPath}
          icon={UsersIcon}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card
          title={t('queue.title')}
          description={t('queue.description')}
          actions={
            orderCounts.PENDING > queue.length ? (
              <NextLink href={`${ordersPath}?status=PENDING`} className="text-sm font-semibold text-accent hover:underline">
                {t('queue.seeAll', { count: orderCounts.PENDING })}
              </NextLink>
            ) : undefined
          }
        >
          {queue.length === 0 ? (
            <p className="py-6 text-text-muted">{t('queue.empty')}</p>
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

        <Card title={t('shortcuts.title')}>
          <ul className="flex flex-col gap-2">
            {[
              { key: 'generate', href: `/${locale}/admin/tags` },
              { key: 'orders', href: ordersPath },
              { key: 'settings', href: `/${locale}/admin/settings` },
            ].map((shortcut) => (
              <li key={shortcut.key}>
                <NextLink
                  href={shortcut.href}
                  className="flex items-center justify-between rounded-sm border border-border-strong px-3 py-2.5 text-sm font-semibold text-text hover:bg-surface-2"
                >
                  {t(`shortcuts.${shortcut.key}` as 'shortcuts.generate')}
                  <span aria-hidden="true">→</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('activations.title')} description={t('activations.description')}>
          {activations.length === 0 ? (
            <p className="py-4 text-text-muted">{t('activations.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {activations.map((tag) => (
                <li key={tag.publicTagId} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span dir="ltr" className="font-mono font-semibold text-text">
                    {tag.publicTagId}
                  </span>
                  <span className="text-text-muted">{formatAge(tag.activatedAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('newCustomers.title')} description={t('newCustomers.description')}>
          {newCustomers.items.length === 0 ? (
            <p className="py-4 text-text-muted">{t('newCustomers.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {newCustomers.items.slice(0, FEED_SIZE).map((customer) => (
                <li key={customer.email} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  {customer.publicUserId ? (
                    <NextLink
                      href={`${customersPath}${customerListSearch({ page: 1, id: customer.publicUserId })}`}
                      dir="ltr"
                      className="truncate font-semibold text-accent hover:underline"
                    >
                      {customer.email}
                    </NextLink>
                  ) : (
                    <span dir="ltr" className="truncate font-semibold text-text">
                      {customer.email}
                    </span>
                  )}
                  <span className="shrink-0 text-text-muted">{formatAge(customer.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t('orders.title')} description={t('orders.description')}>
          <dl className="divide-y divide-border">
            {ORDER_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-text-secondary">{tOrders(`status.${status}`)}</dt>
                <dd className="font-semibold tabular-nums text-text">{orderCounts[status]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title={t('tags.title')} description={t('tags.description')}>
          <dl className="divide-y divide-border">
            {TAG_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-text-secondary">{tTags(`status.${status}`)}</dt>
                <dd className="font-semibold tabular-nums text-text">{tagCounts[status]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title={t('customers.title')} description={t('customers.description')}>
          <dl className="divide-y divide-border">
            {(['total', 'active', 'blocked', 'newLast7Days'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-text-secondary">{t(`customers.${key}`)}</dt>
                <dd className="font-semibold tabular-nums text-text">{customers[key]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
