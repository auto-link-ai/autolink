import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { getSettings } from '@/lib/config/settings';
import { cx } from '@/lib/cx';
import { algiersToday } from '@/lib/care/due';
import { apiUsageRepository } from '@/lib/db/repositories/apiUsage';
import { blockedMessagesRepository } from '@/lib/db/repositories/blockedMessages';
import { MESSAGE_CATEGORIES, type MessageCategory } from '@/lib/domain/constants';
import { formatDateTime } from '@/lib/format/date';
import { deleteBlockedAction, deliverBlockedAction } from './actions';
import { UsagePanel } from './_components/UsagePanel';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RESULTS = ['deleted', 'delivered', 'unavailable', 'not_found', 'forbidden'] as const;
type Result = (typeof RESULTS)[number];
const SUCCESS: ReadonlySet<Result> = new Set(['deleted', 'delivered']);

function isCategory(value: string): value is MessageCategory {
  return (MESSAGE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Messages stopped for abusive words, newest first — so the admin can see what
 * Gemini stops, and deliver one it got wrong. They delete themselves after the
 * message retention period. Owners never see them unless delivered.
 */
export default async function AdminBlockedPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const isAdmin = session.actor.role === 'ADMIN';
  const today = algiersToday().toISOString().slice(0, 10);
  const [t, tCategory, settings, rows, raw, usage] = await Promise.all([
    getTranslations('admin.blocked'),
    getTranslations('scanner.categories'),
    getSettings(),
    blockedMessagesRepository.listForAdmin(session.actor),
    searchParams,
    apiUsageRepository.geminiDays(session.actor, today),
  ]);
  const result = RESULTS.find((r) => r === raw.result) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 max-w-[70ch] text-text-secondary">{t('subtitle', { days: settings.messageRetentionDays })}</p>
      </div>

      <UsagePanel rows={usage} today={today} locale={locale} enabled={Boolean(process.env.GEMINI_API_KEY?.trim())} />

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

      {rows.length === 0 ? (
        <Card>
          <p className="text-text-secondary">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <li key={row.publicId ?? `${row.createdAt.toISOString()}-${i}`}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                  <span>{formatDateTime(row.createdAt, locale)}</span>
                  <span dir="ltr" className="font-mono">
                    {row.publicTagId}
                  </span>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-text">
                    {isCategory(row.category) ? tCategory(row.category) : row.category}
                  </span>
                </div>
                <p dir="auto" className="text-[16px] font-semibold whitespace-pre-line text-text">
                  {row.body}
                </p>
                {row.scannerContact && (
                  <p className="text-sm text-text-secondary">
                    {t('contact')}{' '}
                    <span dir="ltr" className="font-mono">
                      {row.scannerContact}
                    </span>
                  </p>
                )}
                {row.reason && (
                  <p className="text-sm text-danger">
                    {t('reason')} {row.reason}
                  </p>
                )}
                {isAdmin && row.publicId && (
                  <div className="mt-1 flex flex-wrap items-start gap-2">
                    <ConfirmAction
                      tone="neutral"
                      summary={t('deliver')}
                      message={t('deliverConfirm', { tagId: row.publicTagId })}
                      confirm={t('deliverYes')}
                      action={deliverBlockedAction}
                      fields={{ locale, publicId: row.publicId }}
                    />
                    <ConfirmAction
                      summary={t('delete')}
                      message={t('deleteConfirm')}
                      confirm={t('deleteYes')}
                      action={deleteBlockedAction}
                      fields={{ locale, publicId: row.publicId }}
                    />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
