import { getTranslations } from 'next-intl/server';
import { DueChip, dueSentence } from '@/components/care/DueList';
import { buttonClasses } from '@/components/ui/Button';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import { carBookPath } from '@/lib/care/sections';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { cx } from '@/lib/cx';
import { CareForm } from './CareForm';
import { BookCard } from './parts';
import { detailsConfig, formLabels, type CareDetailsSection } from './sectionConfig';

/**
 * Insurance, contrôle technique, vignette, car profile, notes: what is saved,
 * as plain sentences, and "Edit" to change it. Never filled in yet → the form
 * straight away, with nothing to tap first.
 */
export async function DetailsSection({
  section,
  book,
  locale,
  editing,
  soonDays,
}: {
  section: CareDetailsSection;
  book: CarBookDTO;
  locale: Locale;
  editing: boolean;
  soonDays: number;
}) {
  const t = await getTranslations('care');
  const config = await detailsConfig(section, book, locale, soonDays);
  const sectionHref = carBookPath(locale, book.publicTagId, section);

  if (editing || config.empty) {
    return (
      <BookCard>
        <CareForm
          locale={locale}
          tagId={book.publicTagId}
          section={section}
          fields={config.fields}
          labels={await formLabels('save')}
          // Nothing saved yet: cancelling goes back to the overview, not to an empty page.
          cancelHref={config.empty ? carBookPath(locale, book.publicTagId) : sectionHref}
        />
      </BookCard>
    );
  }

  const rows = await Promise.all(
    config.rows.map(async (row) => ({ ...row, text: row.due ? await dueSentence(row.due, locale) : row.value })),
  );

  return (
    <BookCard>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-start sm:gap-6">
            <dt className="text-sm font-semibold text-text-secondary sm:w-2/5 sm:pt-0.5">{row.label}</dt>
            <dd className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              {row.value ? (
                <span
                  dir={row.ltr ? 'ltr' : undefined}
                  className={cx('text-[17px] font-semibold text-text', row.multiline && 'whitespace-pre-line font-normal')}
                >
                  {row.text}
                </span>
              ) : (
                <span className="text-[16px] text-text-muted">{t('notFilled')}</span>
              )}
              {row.due && <DueChip status={row.due.status} locale={locale} />}
            </dd>
          </div>
        ))}
      </dl>
      <PendingLink href={`${sectionHref}?edit=1`} className={buttonClasses('primary', 'md', 'mt-5 w-full sm:w-auto')}>
        {t('edit')}
      </PendingLink>
    </BookCard>
  );
}
