import { getTranslations } from 'next-intl/server';
import { DueChip, dueSentence } from '@/components/care/DueList';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import { CARE_SECTIONS, carBookPath, type CareSection } from '@/lib/care/sections';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import type { CareDueKind } from '@/lib/domain/constants';
import { formatDay } from '@/lib/format/date';

const DUE_KIND: Partial<Record<CareSection, CareDueKind>> = {
  oil: 'OIL_CHANGE',
  insurance: 'INSURANCE',
  inspection: 'INSPECTION',
  vignette: 'VIGNETTE',
};

/** The first line of the notes, short enough for one row. */
function preview(text: string, max = 60): string {
  const line = text.split('\n')[0]!.trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * Every section of the car book, one big row each: its name, where it stands,
 * and a way in. A row with nothing in it says so, which is the invitation.
 */
export async function SectionRows({ book, locale, items }: { book: CarBookDTO; locale: Locale; items: DueItem[] }) {
  const t = await getTranslations('care');
  const itemOf = (kind: CareDueKind) => items.find((item) => item.kind === kind)!;

  const summaryOf = async (section: CareSection): Promise<string> => {
    const kind = DUE_KIND[section];
    if (section === 'oil') {
      const latest = book.oilChanges[0];
      if (!latest) return t('due.notSet');
      const next = itemOf('OIL_CHANGE');
      return next.status === 'unset'
        ? t('summary.last', { when: formatDay(latest.date, locale) })
        : t('summary.next', { when: await dueSentence(next, locale) });
    }
    if (kind) return dueSentence(itemOf(kind), locale);
    if (section === 'repairs') return t('summary.repairs', { count: book.repairs.length });
    if (section === 'profile') {
      const p = book.profile;
      const parts = [p.fuel && t(`profile.fuels.${p.fuel}`), p.year, p.engine].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : t('due.notSet');
    }
    return book.notes ? preview(book.notes) : t('due.notSet');
  };

  const rows = await Promise.all(
    CARE_SECTIONS.map(async (section) => {
      const kind = DUE_KIND[section];
      const status = kind ? itemOf(kind).status : null;
      return { section, summary: await summaryOf(section), status };
    }),
  );

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ section, summary, status }) => (
        <li key={section}>
          <a
            href={carBookPath(locale, book.publicTagId, section)}
            className="flex min-h-18 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-card-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold text-text">{t(`${section}.title`)}</span>
              <span className="block truncate text-[15px] text-text-secondary">{summary}</span>
            </span>
            {status && status !== 'unset' && status !== 'km' && <DueChip status={status} locale={locale} />}
            <span aria-hidden="true" className="inline-block text-2xl leading-none text-text-muted rtl:rotate-180">
              ›
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
