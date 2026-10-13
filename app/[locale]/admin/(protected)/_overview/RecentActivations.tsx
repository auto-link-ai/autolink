import { getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { Card } from '@/components/ui/Card';
import type { Locale } from '@/i18n/locales';
import { customerListSearch } from '@/lib/admin/customerListQuery';
import type { ActivatedTagRow } from '@/lib/db/repositories/tags';
import { formatAge } from '@/lib/format/date';

/** Who activated which sticker, on which car, and when — the shop's pulse. */
export async function RecentActivations({ locale, rows }: { locale: Locale; rows: ActivatedTagRow[] }) {
  const t = await getTranslations('admin.overview.activations');
  return (
    <Card title={t('title')} description={t('description')}>
      {rows.length === 0 ? (
        <p className="py-4 text-text-muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.publicTagId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
              <span dir="ltr" className="font-mono font-semibold text-text">
                {row.publicTagId}
              </span>
              <span className="text-text-secondary">{row.car ?? t('noCar')}</span>
              {row.owner?.publicUserId ? (
                <NextLink
                  href={`/${locale}/admin/customers${customerListSearch({ page: 1, id: row.owner.publicUserId })}`}
                  className="font-semibold text-accent hover:underline"
                >
                  {row.owner.name || t('noName')}
                </NextLink>
              ) : (
                <span className="text-text-muted">{t('noOwner')}</span>
              )}
              <span className="ms-auto text-text-muted">{formatAge(row.activatedAt, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
