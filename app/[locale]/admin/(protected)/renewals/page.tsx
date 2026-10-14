import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { customerListSearch } from '@/lib/admin/customerListQuery';
import { requireAdmin } from '@/lib/admin/auth';
import { getSettings } from '@/lib/config/settings';
import { cx } from '@/lib/cx';
import { adminRenewalsRepository, type AdminRenewalRow } from '@/lib/db/repositories/renewalsAdmin';
import { formatDzd } from '@/lib/format/currency';
import { formatAlgiersDay, formatDateTime } from '@/lib/format/date';
import { formatPhone } from '@/lib/format/phone';
import { periodParts } from '@/lib/renewals/period';
import { cancelRenewalAction, confirmRenewalAction } from './actions';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RESULTS = ['confirmed', 'cancelled', 'conflict', 'unavailable', 'not_found', 'forbidden'] as const;
type Result = (typeof RESULTS)[number];
const SUCCESS: ReadonlySet<Result> = new Set(['confirmed', 'cancelled']);

const STATUS_PILL: Record<AdminRenewalRow['status'], string> = {
  PENDING: 'bg-accent text-accent-ink',
  CONFIRMED: 'bg-success/10 text-success',
  CANCELLED: 'bg-surface-3 text-text-muted',
};

/**
 * Renewals owners asked for from their dashboard. Nothing is paid online: the
 * shop calls the owner, collects the payment, then confirms here — which moves
 * the sticker's end of service forward. Open requests first, oldest first.
 */
export default async function AdminRenewalsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const isAdmin = session.actor.role === 'ADMIN';
  const [t, tCommon, settings, rows, raw] = await Promise.all([
    getTranslations('admin.renewals'),
    getTranslations('common'),
    getSettings(),
    adminRenewalsRepository.listForAdmin(session.actor),
    searchParams,
  ]);
  const result = RESULTS.find((r) => r === raw.result) ?? null;
  const open = rows.filter((row) => row.status === 'PENDING');
  const decided = rows.filter((row) => row.status !== 'PENDING');

  const renderRow = (row: AdminRenewalRow) => (
    <li key={row.ref}>
      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span dir="ltr" className="font-mono font-semibold text-text">
            {row.ref}
          </span>
          <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold', STATUS_PILL[row.status])}>
            {t(`status.${row.status}`)}
          </span>
          <span>{formatDateTime(row.createdAt, locale)}</span>
        </div>
        <p className="text-[16px] font-semibold text-text">
          {t('amount', {
            price: formatDzd(row.price, settings.currencyLabel),
            period: tCommon('period', periodParts(row.months)),
          })}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {row.owner ? (
            <>
              <NextLink
                href={`/${locale}/admin/customers${customerListSearch({ page: 1, id: row.owner.publicUserId })}`}
                className="font-semibold text-accent hover:underline"
              >
                {row.owner.name}
              </NextLink>
              <a dir="ltr" href={`tel:${row.owner.phone}`} className="font-mono text-text hover:underline">
                {formatPhone(row.owner.phone)}
              </a>
            </>
          ) : (
            <span className="text-text-muted">{t('noOwner')}</span>
          )}
          <span dir="ltr" className="font-mono text-text-secondary">
            {row.publicTagId}
          </span>
          {row.car && <span className="text-text-secondary">{row.car}</span>}
        </div>
        <p className="text-sm text-text-secondary">
          {row.serviceUntil
            ? t(row.serviceUntil > new Date() ? 'until' : 'endedOn', { date: formatAlgiersDay(row.serviceUntil, locale) })
            : t('noDate')}
        </p>
        {isAdmin && row.status === 'PENDING' && (
          <div className="mt-1 flex flex-wrap items-start gap-2">
            <ConfirmAction
              tone="neutral"
              summary={t('confirm')}
              message={t('confirmMessage', { tagId: row.publicTagId, period: tCommon('period', periodParts(row.months)) })}
              confirm={t('confirmYes')}
              action={confirmRenewalAction}
              fields={{ locale, ref: row.ref }}
            />
            <ConfirmAction
              summary={t('cancel')}
              message={t('cancelMessage')}
              confirm={t('cancelYes')}
              action={cancelRenewalAction}
              fields={{ locale, ref: row.ref }}
            />
          </div>
        )}
      </Card>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 max-w-[70ch] text-text-secondary">{t('subtitle')}</p>
      </div>

      {result && (
        <p
          role="status"
          className={cx(
            'rounded-sm border px-3 py-2 text-sm',
            SUCCESS.has(result) ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/5 text-danger',
          )}
        >
          {t(`results.${result}`)}
        </p>
      )}

      {open.length === 0 ? (
        <Card>
          <p className="text-text-secondary">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">{open.map(renderRow)}</ul>
      )}

      {decided.length > 0 && (
        <section aria-labelledby="decided" className="flex flex-col gap-3">
          <h2 id="decided" className="text-h3 text-text">
            {t('decided')}
          </h2>
          <ul className="flex flex-col gap-3">{decided.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}
