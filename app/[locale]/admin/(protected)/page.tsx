import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { usersRepository } from '@/lib/db/repositories/users';
import { ORDER_STATUSES, TAG_STATUSES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';

type Props = { params: Promise<{ locale: string }> };

/** The whole business in numbers. Plain figures — no chart library (stack rule). */
export default async function AdminOverviewPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin.overview');
  const tOrders = await getTranslations('admin.orders');
  const tTags = await getTranslations('admin.tags');

  const [orders, tags, customers] = await Promise.all([
    adminOrdersRepository.countByStatus(session.actor),
    tagsRepository.countByStatus(session.actor),
    usersRepository.countSummary(session.actor),
  ]);

  const pending = orders.PENDING;
  const activated = tags.ACTIVE + tags.DEACTIVATED;

  const headline = [
    {
      key: 'pending',
      value: pending,
      href: `/${locale}/admin/orders?status=PENDING`,
      urgent: pending > 0,
    },
    { key: 'unassigned', value: tags.UNASSIGNED, href: `/${locale}/admin/tags?status=UNASSIGNED` },
    { key: 'activated', value: activated, href: `/${locale}/admin/tags?status=ACTIVE` },
    { key: 'customers', value: customers.total, href: `/${locale}/admin/customers` },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((item) => (
          <NextLink
            key={item.key}
            href={item.href}
            className={cx(
              'rounded-md border bg-surface p-5 shadow-card-sm transition-colors hover:bg-surface-2',
              'urgent' in item && item.urgent ? 'border-accent' : 'border-border',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t(`cards.${item.key}`)}</p>
            <p
              className={cx(
                'mt-1 text-h2 tabular-nums',
                'urgent' in item && item.urgent ? 'text-accent' : 'text-text',
              )}
            >
              {item.value}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{t(`hints.${item.key}`)}</p>
          </NextLink>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t('orders.title')} description={t('orders.description')}>
          <dl className="divide-y divide-border">
            {ORDER_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-text-secondary">{tOrders(`status.${status}`)}</dt>
                <dd className="font-semibold tabular-nums text-text">{orders[status]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title={t('tags.title')} description={t('tags.description')}>
          <dl className="divide-y divide-border">
            {TAG_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-text-secondary">{tTags(`status.${status}`)}</dt>
                <dd className="font-semibold tabular-nums text-text">{tags[status]}</dd>
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
