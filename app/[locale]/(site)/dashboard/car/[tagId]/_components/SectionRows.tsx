import { getTranslations } from 'next-intl/server';
import type { ComponentType } from 'react';
import { DuePill } from '@/components/care/DuePill';
import { ClipboardIcon, NoteIcon, OilIcon, RoadIcon, WrenchIcon } from '@/components/care/icons';
import { ShieldIcon, type IconProps } from '@/components/site/icons';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import { carBookPath, CARE_SECTIONS, type CareSection } from '@/lib/care/sections';
import { cx } from '@/lib/cx';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import type { CareDueKind } from '@/lib/domain/constants';
import { formatDayLong } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';

const DUE_KIND: Partial<Record<CareSection, CareDueKind>> = {
  oil: 'OIL_CHANGE',
  insurance: 'INSURANCE',
  inspection: 'INSPECTION',
  vignette: 'VIGNETTE',
};

const ICON: Partial<Record<CareSection, ComponentType<IconProps>>> = {
  oil: OilIcon,
  insurance: ShieldIcon,
  inspection: ClipboardIcon,
  vignette: RoadIcon,
  repairs: WrenchIcon,
  notes: NoteIcon,
};

/** The car's details open from the car card above, so they get no row. */
const ROWS = CARE_SECTIONS.filter((section) => section !== 'profile');

/** The first line of the notes, short enough for one row. */
function preview(text: string, max = 60): string {
  const line = text.split('\n')[0]!.trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * One card per part of the car book: its icon, its name, its date (or what is
 * in it), and a pill with the days left. A part with nothing in it says
 * « À renseigner » in orange — that line is the invitation.
 */
export async function SectionRows({ book, locale, items }: { book: CarBookDTO; locale: Locale; items: DueItem[] }) {
  const t = await getTranslations('care');
  const itemOf = (kind: CareDueKind) => items.find((item) => item.kind === kind)!;

  const lineOf = (section: CareSection): { text: string; empty: boolean } => {
    const kind = DUE_KIND[section];
    if (kind) {
      const item = itemOf(kind);
      const km = item.km !== null ? t('due.atKm', { km: groupThousands(item.km) }) : null;
      if (item.date) {
        const late = item.daysLeft !== null && item.daysLeft < 0 ? t('due.lateDays', { count: -item.daysLeft }) : null;
        return { text: [formatDayLong(item.date, locale), late, km].filter(Boolean).join(' · '), empty: false };
      }
      if (km) return { text: km, empty: false };
      const latest = section === 'oil' ? book.oilChanges[0] : undefined;
      if (latest) return { text: t('summary.last', { when: formatDayLong(latest.date, locale) }), empty: false };
      return { text: t('due.notSet'), empty: true };
    }
    if (section === 'repairs') return { text: t('summary.repairs', { count: book.repairs.length }), empty: false };
    return book.notes ? { text: preview(book.notes), empty: false } : { text: t('due.notSet'), empty: true };
  };

  return (
    <ul aria-label={t('overview.everything')} className="flex flex-col gap-3">
      {ROWS.map((section) => {
        const kind = DUE_KIND[section];
        const Icon = ICON[section]!;
        const line = lineOf(section);
        return (
          <li key={section}>
            <PendingLink
              href={carBookPath(locale, book.publicTagId, section)}
              className="flex min-h-20 items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-card-sm transition-shadow hover:shadow-card-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:px-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] leading-snug font-bold text-text">
                  {kind ? t(`due.kinds.${kind}`) : t(`${section}.title`)}
                </span>
                <span className={cx('line-clamp-2 block text-[15px] leading-snug', line.empty ? 'font-semibold text-accent' : 'text-text-secondary')}>
                  {line.text}
                </span>
              </span>
              {kind && <DuePill item={itemOf(kind)} locale={locale} />}
              <span aria-hidden="true" className="inline-block text-2xl leading-none text-text-muted rtl:rotate-180">
                ›
              </span>
            </PendingLink>
          </li>
        );
      })}
    </ul>
  );
}
