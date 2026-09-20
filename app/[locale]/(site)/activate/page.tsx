import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { normalizeActivationCodeInput } from '@/lib/validation/activationCode';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import { ActivateForm, type ActivateLabels } from './ActivateForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'activate' });
  // The URL can carry an activation code: never index it, never send a referrer.
  return { title: t('metaTitle'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function ActivatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const raw = await searchParams;
  // Keep the claim link's parameters through the sign-in round trip.
  const query = new URLSearchParams();
  if (first(raw.t)) query.set('t', first(raw.t));
  if (first(raw.c)) query.set('c', first(raw.c));
  const search = query.toString();
  await requireOwner(locale, `/${locale}/activate${search ? `?${search}` : ''}`);

  const t = await getTranslations('activate');
  const labels: ActivateLabels = {
    tagId: t('fields.tagId'),
    tagIdHint: t('fields.tagIdHint'),
    code: t('fields.code'),
    codeHint: t('fields.codeHint'),
    brand: t('fields.brand'),
    model: t('fields.model'),
    color: t('fields.color'),
    plate: t('fields.plate'),
    plateHint: t('fields.plateHint'),
    showDetails: t('fields.showDetails'),
    showDetailsHint: t('fields.showDetailsHint'),
    submit: t('submit'),
    submitting: t('submitting'),
    errors: {
      invalid: t('errors.invalid'),
      too_short: t('errors.too_short'),
      too_long: t('errors.too_long'),
      locked: t('errors.locked'),
      rate_limited: t('errors.rate_limited'),
      server_error: t('errors.server_error'),
    },
  };

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-[760px]">
          <ActivateForm
            locale={locale}
            labels={labels}
            defaultTagId={normalizeTagIdInput(first(raw.t)) ?? ''}
            defaultCode={normalizeActivationCodeInput(first(raw.c)) ?? ''}
          />
          <p className="mt-6 rounded-2xl bg-surface-3 px-5 py-4 text-[15px] leading-relaxed text-text-secondary">
            {t('help')}
          </p>
        </div>
      </section>
    </>
  );
}
