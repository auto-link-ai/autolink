import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import {
  CUSTOMER_SUCCESS_RESULTS,
  customerListSearch,
  parseCustomerListQuery,
  parseCustomerResult,
  type CustomerListQuery,
} from '@/lib/admin/customerListQuery';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { usersRepository } from '@/lib/db/repositories/users';
import { USER_STATUSES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';
import { formatDateTime } from '@/lib/format/date';
import { CustomerDetail } from './_components/CustomerDetail';
import { NewCustomerForm } from './_components/NewCustomerForm';
import { newCustomerLabels } from './_components/newCustomerLabels';
import { buttonClasses } from '@/components/ui/Button';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCustomersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin.customers');

  const raw = await searchParams;
  const query = parseCustomerListQuery(raw);
  const result = parseCustomerResult(raw.result);
  const listPath = `/${locale}/admin/customers`;
  const hrefFor = (patch: Partial<CustomerListQuery>) =>
    `${listPath}${customerListSearch({ ...query, page: 1, ...patch })}`;
  const returnSearch = customerListSearch(query);

  const [summary, page] = await Promise.all([
    usersRepository.countSummary(session.actor),
    usersRepository.listForAdmin(
      session.actor,
      { status: query.status, email: query.email, phone: query.phone },
      query.page,
    ),
  ]);

  const selected = query.id ? await usersRepository.getForAdmin(session.actor, query.id) : null;
  const stickers = selected ? await ownerTagsRepository.listForOwnerAdmin(session.actor, selected.publicUserId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 text-text">{t('title')}</h1>
          <p className="mt-1 text-text-secondary">
            {t('subtitle', { total: summary.total, blocked: summary.blocked, recent: summary.newLast7Days })}
          </p>
        </div>
        {session.actor.role === 'ADMIN' && (
          <NextLink href={`${listPath}?new=1`} className={buttonClasses('primary', 'sm')}>
            + {t('new.button')}
          </NextLink>
        )}
      </div>

      {raw.new === '1' && session.actor.role === 'ADMIN' && (
        <Card title={t('new.title')} description={t('new.hint')}>
          <NewCustomerForm locale={locale} listHref={listPath} labels={await newCustomerLabels()} />
        </Card>
      )}

      {result && (
        <p
          role="status"
          className={cx(
            'rounded-sm border px-3 py-2 text-sm',
            CUSTOMER_SUCCESS_RESULTS.has(result) ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/5 text-danger',
          )}
        >
          {t(`results.${result}`)}
        </p>
      )}

      {selected && (
        <CustomerDetail
          customer={selected}
          stickers={stickers}
          locale={locale}
          returnSearch={returnSearch}
          canEdit={session.actor.role === 'ADMIN'}
        />
      )}

      <Card title={t('list.title')} description={t('list.count', { count: page.total })}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label={t('list.filterLabel')} className="flex flex-wrap gap-1.5">
            {[undefined, ...USER_STATUSES].map((status) => {
              const active = status === query.status;
              return (
                <NextLink
                  key={status ?? 'all'}
                  href={hrefFor({ status, id: undefined })}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold',
                    active
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-2',
                  )}
                >
                  {status ? t(`status.${status}`) : t('list.filterAll')}
                  <span className="ms-2 text-xs opacity-70">
                    {status === 'BLOCKED' ? summary.blocked : status === 'ACTIVE' ? summary.active : summary.total}
                  </span>
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

        {page.items.length === 0 ? (
          <p className="py-6 text-text-muted">{t('list.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-start text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  {(['email', 'name', 'phone', 'stickers', 'registered', 'lastLogin', 'status'] as const).map((key) => (
                    <th key={key} scope="col" className="py-2 pe-4 text-start font-semibold">
                      {t(`list.columns.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((customer) => (
                  // Keyed by email: unique in the database, and present even on
                  // an account that predates public ids.
                  <tr key={customer.email} className="align-middle">
                    <td className="py-3 pe-4">
                      {customer.publicUserId ? (
                        <NextLink
                          href={`${listPath}${customerListSearch({ ...query, id: customer.publicUserId })}`}
                          dir="ltr"
                          className="font-semibold text-accent hover:underline"
                        >
                          {customer.email}
                        </NextLink>
                      ) : (
                        <span dir="ltr" className="font-semibold text-text">
                          {customer.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pe-4 text-text">{customer.name ?? '—'}</td>
                    {/* dir on the value, not the cell: on the cell it flips which
                        side the padding lands on, and the columns collide in Arabic. */}
                    <td className="py-3 pe-4 text-text-secondary">
                      <span dir="ltr">{customer.phone ?? '—'}</span>
                    </td>
                    <td className="py-3 pe-4 text-text">{customer.stickerCount}</td>
                    <td className="py-3 pe-4 text-text-secondary">{formatDateTime(customer.createdAt, locale)}</td>
                    <td className="py-3 pe-4 text-text-secondary">
                      {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt, locale) : t('detail.never')}
                    </td>
                    <td className="py-3 pe-4">
                      <span
                        className={cx(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          customer.status === 'BLOCKED' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
                        )}
                      >
                        {t(`status.${customer.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page.pageCount > 1 && (
          <nav aria-label={t('list.pagination')} className="mt-4 flex items-center gap-3 text-sm">
            {page.page > 1 && (
              <NextLink
                href={`${listPath}${customerListSearch({ ...query, page: page.page - 1 })}`}
                className="font-semibold text-accent hover:underline"
              >
                {t('list.previous')}
              </NextLink>
            )}
            <span className="text-text-muted">{t('list.pageOf', { page: page.page, pages: page.pageCount })}</span>
            {page.page < page.pageCount && (
              <NextLink
                href={`${listPath}${customerListSearch({ ...query, page: page.page + 1 })}`}
                className="font-semibold text-accent hover:underline"
              >
                {t('list.next')}
              </NextLink>
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}
