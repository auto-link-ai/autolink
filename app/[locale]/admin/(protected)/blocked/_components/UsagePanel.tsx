import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { formatDay } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';
import { totalsSince, type UsageDay, type UsageTotals } from '@/lib/moderation/usage';

const COLUMNS = ['day', 'colChecks', 'colStopped', 'colPassed', 'colFailed', 'colIn', 'colOut'] as const;

/**
 * How much the Gemini check is used: today, the last 7 and 30 days, and one
 * row per day. Tokens as Gemini reports them — the bill itself is in Google
 * AI Studio; no price is guessed here.
 */
export async function UsagePanel({
  rows,
  today,
  locale,
  enabled,
}: {
  rows: UsageDay[];
  /** YYYY-MM-DD, Algeria's calendar day. */
  today: string;
  locale: Locale;
  /** A key is configured, so messages are being checked. */
  enabled: boolean;
}) {
  const t = await getTranslations('admin.blocked.usage');
  const n = (value: number) => groupThousands(value);
  const periods: { label: string; totals: UsageTotals }[] = [
    { label: t('today'), totals: totalsSince(rows, today, 1) },
    { label: t('week'), totals: totalsSince(rows, today, 7) },
    { label: t('month'), totals: totalsSince(rows, today, 30) },
  ];

  return (
    <Card title={t('title')} description={t('costNote')}>
      <p
        className={cx(
          'mb-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold',
          enabled ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
        )}
      >
        {enabled ? t('on') : t('off')}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {periods.map(({ label, totals }) => (
          <div key={label} className="rounded-md border border-border bg-surface-2 p-4">
            <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</p>
            <p className="mt-1 text-h3 text-text tabular-nums">{t('checks', { count: totals.checks })}</p>
            <p className="mt-1 text-sm text-text-secondary tabular-nums">
              {t('split', { stopped: n(totals.abusive), passed: n(totals.fine), failed: n(totals.failed) })}
            </p>
            <p className="mt-1 text-sm text-text-secondary tabular-nums">
              {t('tokens', {
                total: n(totals.promptTokens + totals.outputTokens),
                prompt: n(totals.promptTokens),
                output: n(totals.outputTokens),
              })}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">{t('empty')}</p>
      ) : (
        <div className="-mx-5 mt-4 overflow-x-auto md:mx-0">
          <table className="w-full min-w-[640px] text-sm tabular-nums">
            <thead className="border-b border-border text-xs tracking-wide text-text-muted uppercase">
              <tr>
                {COLUMNS.map((key) => (
                  <th key={key} scope="col" className="px-3 py-2 text-start font-semibold">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.day}>
                  <td className="px-3 py-2">{formatDay(new Date(`${row.day}T00:00:00.000Z`), locale)}</td>
                  <td className="px-3 py-2">{n(row.checks)}</td>
                  <td className={cx('px-3 py-2', row.abusive > 0 && 'font-semibold text-danger')}>{n(row.abusive)}</td>
                  <td className="px-3 py-2">{n(row.fine)}</td>
                  <td className={cx('px-3 py-2', row.failed > 0 && 'font-semibold text-accent')}>{n(row.failed)}</td>
                  <td className="px-3 py-2">{n(row.promptTokens)}</td>
                  <td className="px-3 py-2">{n(row.outputTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
