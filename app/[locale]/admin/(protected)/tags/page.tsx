import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { parseTagListQuery, parseTransitionResult, tagListSearch } from '@/lib/admin/tagListQuery';
import { cx } from '@/lib/cx';
import { tagBatchesRepository } from '@/lib/db/repositories/tagBatches';
import { tagsRepository, type AdminTagPage } from '@/lib/db/repositories/tags';
import { BATCH_LIMITS, TAG_STATUSES } from '@/lib/domain/constants';
import { resolveQrBaseUrl } from '@/lib/tags/tagUrl';
import { BatchesTable } from './_components/BatchesTable';
import { GenerateBatchForm } from './_components/GenerateBatchForm';
import { TagsTable } from './_components/TagsTable';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_PAGE: AdminTagPage = { items: [], total: 0, page: 1, pageCount: 1 };

// Every error code the batch endpoints (and the client) can produce.
const ERROR_CODES = [
  'base_url_missing',
  'base_url_invalid',
  'base_url_not_https',
  'base_url_local_host',
  'template_invalid',
  'invalid_input',
  'conflict',
  'not_found',
  'nothing_to_reissue',
  'forbidden_role',
  'unauthorized',
  'forbidden',
  'server_error',
  'network',
] as const;

export default async function AdminTagsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);

  const raw = await searchParams;
  const query = parseTagListQuery(raw);
  const result = parseTransitionResult(raw.result);

  const [batches, tagPage] = await Promise.all([
    tagBatchesRepository.listForAdmin(session.actor),
    query.invalidSearch
      ? Promise.resolve(EMPTY_PAGE)
      : tagsRepository.listForAdmin(session.actor, { status: query.status, idPrefix: query.idPrefix, page: query.page }),
  ]);

  const t = await getTranslations('admin.tags');
  const tErrors = await getTranslations('admin.tags.errors');
  // `{detail}` is kept as a literal placeholder for the client to fill in.
  const errors: Record<string, string> = Object.fromEntries(
    ERROR_CODES.map((code) => [code, tErrors(code, { detail: '{detail}' })]),
  );
  const isAdmin = session.actor.role === 'ADMIN';
  const qr = resolveQrBaseUrl();
  const blockedReason = !isAdmin ? t('generate.adminOnly') : qr.ok ? null : (errors[qr.problem] ?? null);

  const listPath = `/${locale}/admin/tags`;
  const currentSearch = tagListSearch({ ...query, page: tagPage.page });
  const hrefFor = (overrides: Partial<Pick<typeof query, 'status' | 'page'>>) =>
    `${listPath}${tagListSearch({ status: query.status, q: query.q, page: 1, ...overrides })}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-text">{t('title')}</h1>

      <Card title={t('generate.title')} description={t('generate.intro')}>
        <GenerateBatchForm
          labels={{
            label: t('generate.label'),
            labelHint: t('generate.labelHint'),
            quantity: t('generate.quantity'),
            quantityHint: t('generate.quantityHint', { max: BATCH_LIMITS.maxQuantity }),
            qrTarget: t('generate.qrTarget'),
            submit: t('generate.submit'),
            working: t('generate.working'),
            done: t('generate.done'),
          }}
          errors={errors}
          maxQuantity={BATCH_LIMITS.maxQuantity}
          maxLabelLength={BATCH_LIMITS.maxLabelLength}
          qrBaseUrl={qr.ok ? qr.baseUrl : null}
          blockedReason={blockedReason}
        />
      </Card>

      <Card title={t('batches.title')}>
        <BatchesTable batches={batches} locale={locale} canReissue={isAdmin && qr.ok} errors={errors} />
      </Card>

      <Card title={t('list.title')} description={t('list.count', { count: tagPage.total })}>
        {result && (
          <p
            role="status"
            className={cx(
              'mb-4 rounded-sm border px-3 py-2 text-sm',
              result === 'ok' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/5 text-danger',
            )}
          >
            {t(`results.${result}`)}
          </p>
        )}

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label={t('list.filterLabel')} className="flex flex-wrap gap-1.5">
            {[undefined, ...TAG_STATUSES].map((status) => {
              const active = status === query.status;
              return (
                <NextLink
                  key={status ?? 'all'}
                  href={hrefFor({ status })}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold',
                    active
                      ? 'border-navy bg-surface-inverse text-text-on-inverse'
                      : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-2',
                  )}
                >
                  {status ? t(`status.${status}`) : t('list.filterAll')}
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
                className="h-11 w-56 rounded-sm border border-border-strong bg-surface px-3 font-mono text-sm font-normal"
              />
            </label>
            <button type="submit" className={buttonClasses('secondary', 'sm')}>
              {t('list.search')}
            </button>
          </form>
        </div>

        <TagsTable rows={tagPage.items} locale={locale} returnSearch={currentSearch} />

        {tagPage.pageCount > 1 && (
          <nav className="mt-4 flex items-center justify-between gap-3 text-sm">
            {tagPage.page > 1 ? (
              <NextLink href={hrefFor({ page: tagPage.page - 1 })} className={buttonClasses('secondary', 'sm')}>
                {t('list.previous')}
              </NextLink>
            ) : (
              <span />
            )}
            <span className="text-text-muted">{t('list.page', { page: tagPage.page, pages: tagPage.pageCount })}</span>
            {tagPage.page < tagPage.pageCount ? (
              <NextLink href={hrefFor({ page: tagPage.page + 1 })} className={buttonClasses('secondary', 'sm')}>
                {t('list.next')}
              </NextLink>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}
