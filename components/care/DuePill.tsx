import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { duePill, type DueItem } from '@/lib/care/due';
import { cx } from '@/lib/cx';

const TONE = {
  late: 'bg-danger/10 text-danger',
  soon: 'bg-accent-soft text-accent',
  ok: 'bg-success/10 text-success',
} as const;

/**
 * Beside a date in the car book: « En retard », « Aujourd'hui » or the days
 * left (« 45 jours »). Always in words, the colour only repeats them. Nothing
 * when there is no date.
 */
export async function DuePill({ item, locale }: { item: DueItem; locale: Locale }) {
  const pill = duePill(item);
  if (!pill) return null;
  const t = await getTranslations({ locale, namespace: 'care.pill' });
  const words = pill.tone === 'late' ? t('late') : pill.days === 0 ? t('today') : t('days', { count: pill.days });
  return (
    <span className={cx('inline-flex shrink-0 rounded-full px-3 py-1 text-[13px] font-bold whitespace-nowrap', TONE[pill.tone])}>
      {words}
    </span>
  );
}
