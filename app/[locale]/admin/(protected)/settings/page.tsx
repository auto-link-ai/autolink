import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { getSettings } from '@/lib/config/settings';
import { getWilayas } from '@/lib/config/wilayas';
import { cx } from '@/lib/cx';
import { saveCommerceSettingsAction } from './actions';
import { FeeTable, type FeeRowInput } from './_components/FeeTable';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RESULTS = ['ok', 'invalid', 'error', 'forbidden'] as const;
const INPUT = 'h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent';

export default async function AdminSettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin.settings');

  const raw = await searchParams;
  const resultParam = Array.isArray(raw.result) ? raw.result[0] : raw.result;
  const result = RESULTS.find((code) => code === resultParam) ?? null;

  const [settings, wilayas] = await Promise.all([getSettings(), getWilayas()]);
  const isAdmin = session.actor.role === 'ADMIN';

  const feeByCode = new Map(settings.deliveryFees.map((fee) => [fee.wilayaCode, fee]));
  const rows: FeeRowInput[] = wilayas.map((w) => ({
    code: w.code,
    name: locale === 'ar' ? w.nameAr : locale === 'en' ? w.nameEn : w.nameFr,
    home: feeByCode.get(w.code)?.home ?? 0,
    stopdesk: feeByCode.get(w.code)?.stopdesk ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-1 max-w-[70ch] text-text-secondary">{t('subtitle')}</p>
      </div>

      {result && (
        <p
          role="status"
          className={cx(
            'rounded-sm border px-3 py-2 text-sm',
            result === 'ok' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/5 text-danger',
          )}
        >
          {t(`results.${result}`)}
        </p>
      )}

      {!isAdmin && <p className="rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary">{t('readOnly')}</p>}

      <form action={saveCommerceSettingsAction} className="flex flex-col gap-6">
        <input type="hidden" name="locale" value={locale} />

        <Card title={t('commerce.title')} description={t('commerce.description')}>
          <fieldset disabled={!isAdmin} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('commerce.unitPrice')}
              <input type="number" name="unitPriceDzd" min={0} defaultValue={settings.unitPriceDzd} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('commerce.currencyLabel')}
              <input name="currencyLabel" maxLength={8} defaultValue={settings.currencyLabel} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('commerce.maxQuantity')}
              <input
                type="number"
                name="maxOrderQuantity"
                min={1}
                max={100}
                defaultValue={settings.maxOrderQuantity}
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              {t('commerce.orderRateLimit')}
              <input
                type="number"
                name="rateLimitOrdersPerHour"
                min={1}
                max={1000}
                defaultValue={settings.rateLimitOrdersPerHour}
                className={INPUT}
              />
            </label>
          </fieldset>
        </Card>

        <Card title={t('fees.title')} description={t('fees.description')}>
          <fieldset disabled={!isAdmin}>
            <FeeTable
              rows={rows}
              labels={{
                wilaya: t('fees.wilaya'),
                home: t('fees.home'),
                stopdesk: t('fees.stopdesk'),
                fillAll: t('fees.fillAll'),
                fillHome: t('fees.fillHome'),
                fillStopdesk: t('fees.fillStopdesk'),
              }}
            />
          </fieldset>
        </Card>

        {isAdmin && (
          <div>
            <Button type="submit">{t('save')}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
