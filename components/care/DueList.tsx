import { getTranslations } from 'next-intl/server';
import type { ComponentType, ReactNode } from 'react';
import type { Locale } from '@/i18n/locales';
import type { DueItem, DueStatus } from '@/lib/care/due';
import type { CareDueKind } from '@/lib/domain/constants';
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

/** "12 Oct 2026 · In 3 days", "At 85 000 km", "To fill in". */
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

/** The status in words — never colour alone. */
export async function DueChip({ status, locale }: { status: DueStatus; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'care.due' });
  return (
    <span className={cx('inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap', CHIP[status])}>
      {t(`status.${status}`)}
    </span>
  );
}

/**
 * What is coming up for one car, most urgent first. With `hrefFor`, each row
 * is a link to where that date is kept — a plain one by default, because this
 * also runs on the scan page, which has a strict JavaScript budget.
 */
export async function DueList({
  items,
  locale,
  hrefFor,
  linkAs,
}: {
  items: DueItem[];
  locale: Locale;
  hrefFor?: (kind: CareDueKind) => string;
  /**
   * The car book passes its client link, so a row moves without reloading. The
   * scan page passes nothing: not a byte of navigation code reaches it.
   */
  linkAs?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
}) {
  const t = await getTranslations({ locale, namespace: 'care.due' });
  const sentences = await Promise.all(items.map((item) => dueSentence(item, locale)));
  const Row = linkAs ?? 'a';

  return (
    <ul className="divide-y divide-border">
      {items.map((item, i) => {
        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-text">{t(`kinds.${item.kind}`)}</span>
              <span className="block text-sm text-text-secondary">{sentences[i]}</span>
            </span>
            <DueChip status={item.status} locale={locale} />
          </>
        );
        return (
          <li key={item.kind}>
            {hrefFor ? (
              <Row
                href={hrefFor(item.kind)}
                className="-mx-2 flex min-h-16 items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {body}
                <span aria-hidden="true" className="inline-block text-xl text-text-muted rtl:rotate-180">
                  ›
                </span>
              </Row>
            ) : (
              <div className="flex min-h-16 items-center gap-3 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
