import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import type { DueItem, DueStatus } from '@/lib/care/due';
import { cx } from '@/lib/cx';
import { formatDay } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';

const CHIP: Record<DueStatus, string> = {
  overdue: 'bg-danger/10 text-danger',
  soon: 'bg-accent-soft text-accent',
  ok: 'bg-success/10 text-success',
  km: 'bg-surface-3 text-text-secondary',
  unset: 'bg-surface-3 text-text-muted',
};

/** "12 Oct 2026 · In 3 days", "At 85 000 km", "Add it below". */
export async function dueSentence(item: DueItem, locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'care.due' });
  const km = item.km !== null ? t('atKm', { km: groupThousands(item.km) }) : null;
  if (!item.date || item.daysLeft === null) return km ?? t('notSet');

  const relative =
    item.daysLeft === 0
      ? t('today')
      : item.daysLeft > 0
        ? t('inDays', { count: item.daysLeft })
        : t('lateDays', { count: -item.daysLeft });
  return [formatDay(item.date, locale), relative, km].filter(Boolean).join(' · ');
}

/**
 * What is coming up for one car: oil change, insurance, contrôle technique,
 * vignette — most urgent first. Server-rendered, no JavaScript: it also runs
 * on the scan page, which has a strict budget.
 */
export async function DueList({ items, locale }: { items: DueItem[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'care.due' });
  const sentences = await Promise.all(items.map((item) => dueSentence(item, locale)));

  return (
    <ul className="divide-y divide-border">
      {items.map((item, i) => (
        <li key={item.kind} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-text">{t(`kinds.${item.kind}`)}</p>
            <p className="text-sm text-text-secondary">{sentences[i]}</p>
          </div>
          <span className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-bold', CHIP[item.status])}>
            {t(`status.${item.status}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
