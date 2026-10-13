import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { InstalledHint } from '@/components/site/InstalledHint';
import { href } from '@/components/site/links';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getOwnerSession } from '@/lib/auth/session';
import { pageMetadata } from '@/lib/site/seo';
import { authErrorLabels } from '../_auth/labels';
import { PinLoginForm } from '../_auth/PinLoginForm';
import { safeNext } from '../_auth/state';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return { ...pageMetadata(locale, '/login', { title: t('metaTitle'), description: t('metaDescription') }), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const raw = await searchParams;
  const next = typeof raw.next === 'string' ? raw.next : undefined;

  // Already signed in: go where they were heading.
  if (await getOwnerSession()) redirect(safeNext(next, locale));

  return (
    <>
      <PageHero eyebrow={t('login.eyebrow')} title={t('login.title')} subtitle={t('login.subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-130">
          <InstalledHint text={t('login.installedHint')} />
          <PinLoginForm
            locale={locale}
            next={next}
            labels={{
              phone: t('fields.phone'),
              pin: t('fields.pin'),
              forgot: t('login.forgot'),
              forgotLink: t('login.forgotLink'),
              forgotHref: href(locale, '/forgot-pin'),
              submit: t('login.submit'),
              submitting: t('login.submitting'),
              newHere: t('login.newHere'),
              newHereLink: t('login.newHereLink'),
              newHereHref: href(locale, '/activate'),
              errors: await authErrorLabels(),
            }}
          />
        </div>
      </section>
    </>
  );
}
