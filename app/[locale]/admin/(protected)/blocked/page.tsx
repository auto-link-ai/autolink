import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { getSettings } from '@/lib/config/settings';
import { blockedMessagesRepository } from '@/lib/db/repositories/blockedMessages';
import { MESSAGE_CATEGORIES, type MessageCategory } from '@/lib/domain/constants';
import { formatDateTime } from '@/lib/format/date';

type Props = { params: Promise<{ locale: string }> };

function isCategory(value: string): value is MessageCategory {
  return (MESSAGE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Messages stopped for abusive words, newest first — so the admin can see what
 * Gemini stops, and notice if it stops too much. They delete themselves after
 * the message retention period. Owners never see them.
 */
export default async function AdminBlockedPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const [t, tCategory, settings, rows] = await Promise.all([
    getTranslations('admin.blocked'),
    getTranslations('scanner.categories'),
    getSettings(),
    blockedMessagesRepository.listForAdmin(session.actor),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 max-w-[70ch] text-text-secondary">{t('subtitle', { days: settings.messageRetentionDays })}</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-text-secondary">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <li key={`${row.createdAt.toISOString()}-${i}`}>
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
                {row.reason && (
                  <p className="text-sm text-danger">
                    {t('reason')} {row.reason}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
