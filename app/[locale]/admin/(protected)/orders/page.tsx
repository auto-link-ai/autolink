import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import {
  ORDER_SUCCESS_RESULTS,
  orderListSearch,
  parseOrderListQuery,
  parseOrderResult,
  type OrderListQuery,
} from '@/lib/admin/orderListQuery';
import { adminOrdersRepository, ADMIN_ORDER_PAGE_SIZE } from '@/lib/db/repositories/ordersAdmin';
import { ORDER_STATUSES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';
import { formatDzd } from '@/lib/format/currency';
import { formatDateTime } from '@/lib/format/date';
import { OrderDetail } from './_components/OrderDetail';
import { OrderForm } from './_components/OrderForm';
import { orderFormLabels } from './_components/orderFormLabels';
import { getWilayas } from '@/lib/config/wilayas';
import { buttonClasses } from '@/components/ui/Button';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin.orders');

  const raw = await searchParams;
  const query = parseOrderListQuery(raw);
  const result = parseOrderResult(raw.result);
  const listPath = `/${locale}/admin/orders`;
  const hrefFor = (patch: Partial<OrderListQuery>) => `${listPath}${orderListSearch({ ...query, page: 1, ...patch })}`;
  const returnSearch = orderListSearch(query);

  const [counts, page, wilayas] = await Promise.all([
    adminOrdersRepository.countByStatus(session.actor),
    adminOrdersRepository.list(
      session.actor,
      query.invalidSearch
        ? { status: query.status, orderRef: 'AL-000000' }
        : { status: query.status, orderRef: query.orderRef, phone: query.phone },
      query.page,
    ),
    getWilayas(),
  ]);
  const wilayaName = (code: number) => {
    const w = wilayas.find((x) => x.code === code);
    return w ? (locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr) : String(code);
  };

  const selected = query.ref ? await adminOrdersRepository.get(session.actor, query.ref) : null;
  // « Nouvelle commande » opens the empty form at the top of the page.
  const creating = raw.new === '1';
  const [editLabels, newLabels] = await Promise.all([
    selected ? orderFormLabels('edit') : null,
    creating ? orderFormLabels('new') : null,
  ]);
  const wilayaOptions = wilayas.map((w) => ({
    code: w.code,
    name: locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr,
  }));
  const total = ORDER_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 text-text">{t('title')}</h1>
          <p className="mt-1 text-text-secondary">{t('subtitle', { pending: counts.PENDING })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NextLink href={`${listPath}?new=1`} className={buttonClasses('primary', 'sm')}>
            + {t('form.newOrder')}
          </NextLink>
          <a
            href={`/api/admin/orders/export${returnSearch}`}
            className="inline-flex h-11 items-center rounded-sm border border-border-strong bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2"
          >
            {t('export')}
          </a>
        </div>
      </div>

      {creating && newLabels && (
        <Card title={t('form.newTitle')} description={t('form.newHint')}>
          <OrderForm locale={locale} returnSearch={returnSearch} values={{ quantity: '1' }} wilayas={wilayaOptions} labels={newLabels} cancelHref={listPath} />
        </Card>
      )}

      {result && (
        <p
          role="status"
          className={cx(
            'rounded-sm border px-3 py-2 text-sm',
            ORDER_SUCCESS_RESULTS.has(result) ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/5 text-danger',
          )}
        >
          {t(`results.${result}`)}
        </p>
      )}

      {selected && editLabels && (
        <OrderDetail
          order={selected}
          locale={locale}
          returnSearch={returnSearch}
          wilayaName={wilayaName(selected.wilayaCode)}
          wilayas={wilayaOptions}
          formLabels={editLabels}
          canDelete={session.actor.role === 'ADMIN'}
        />
      )}

      <Card title={t('list.title')} description={t('list.count', { count: page.total })}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label={t('list.filterLabel')} className="flex flex-wrap gap-1.5">
            {[undefined, ...ORDER_STATUSES].map((status) => {
              const active = status === query.status;
              return (
                <NextLink
                  key={status ?? 'all'}
                  href={hrefFor({ status, ref: undefined })}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold',
                    active
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-2',
                  )}
                >
                  {status ? t(`status.${status}`) : t('list.filterAll')}
                  <span className="ms-2 text-xs opacity-70">{status ? counts[status] : total}</span>
                </NextLink>
              );
            })}
          </nav>

          <form method="get" action={listPath} role="search" className="flex items-end gap-2">
            {query.status && <input type="hidden" name="status" value={query.status} />}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('list.searchLabel')}
              <input
                name="q"
                defaultValue={query.q}
                placeholder={t('list.searchPlaceholder')}
                dir="ltr"
                className="h-11 w-56 rounded-sm border border-border-strong bg-surface px-3 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-sm border border-border-strong bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2"
            >
              {t('list.searchSubmit')}
            </button>
          </form>
        </div>

        {query.invalidSearch && <p className="mb-3 text-sm text-danger">{t('list.invalidSearch')}</p>}

        {page.items.length === 0 ? (
          <p className="py-6 text-text-muted">{t('list.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  {(['ref', 'date', 'customer', 'wilaya', 'quantity', 'total', 'status'] as const).map((key) => (
                    <th key={key} scope="col" className="py-2 pe-4 text-start font-semibold">
                      {t(`list.columns.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((order) => (
                  <tr key={order.orderRef} className="align-middle">
                    <td className="py-3 pe-4">
                      <NextLink
                        href={`${listPath}${orderListSearch({ ...query, ref: order.orderRef })}`}
                        dir="ltr"
                        className="font-mono font-semibold text-accent hover:underline"
                      >
                        {order.orderRef}
                      </NextLink>
                    </td>
                    <td className="py-3 pe-4 text-text-secondary">{formatDateTime(order.createdAt, locale)}</td>
                    <td className="py-3 pe-4 text-text">{order.customerName}</td>
                    <td className="py-3 pe-4 text-text-secondary">{wilayaName(order.wilayaCode)}</td>
                    <td className="py-3 pe-4 text-text">{order.quantity}</td>
                    <td dir="ltr" className="py-3 pe-4 text-text">
                      {formatDzd(order.totalPrice)}
                    </td>
                    <td className="py-3 pe-4">
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                        {t(`status.${order.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page.pageCount > 1 && (
          <nav aria-label={t('list.pagination')} className="mt-4 flex items-center justify-between gap-3 text-sm">
            <NextLink
              href={`${listPath}${orderListSearch({ ...query, page: Math.max(1, page.page - 1) })}`}
              aria-disabled={page.page === 1}
              className={cx('rounded-sm px-3 py-2 font-semibold', page.page === 1 ? 'pointer-events-none text-text-muted' : 'text-accent hover:underline')}
            >
              {t('list.previous')}
            </NextLink>
            <span className="text-text-secondary">
              {t('list.pageOf', { page: page.page, pages: page.pageCount, size: ADMIN_ORDER_PAGE_SIZE })}
            </span>
            <NextLink
              href={`${listPath}${orderListSearch({ ...query, page: Math.min(page.pageCount, page.page + 1) })}`}
              aria-disabled={page.page === page.pageCount}
              className={cx(
                'rounded-sm px-3 py-2 font-semibold',
                page.page === page.pageCount ? 'pointer-events-none text-text-muted' : 'text-accent hover:underline',
              )}
            >
              {t('list.next')}
            </NextLink>
          </nav>
        )}
      </Card>
    </div>
  );
}
