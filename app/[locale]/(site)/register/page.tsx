import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { href } from '@/components/site/links';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getOwnerSession } from '@/lib/auth/session';
import { pageMetadata } from '@/lib/site/seo';
import { AuthForm, type AuthLabels } from '../_auth/AuthForm';
import { safeNext } from '../_auth/state';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'auth.register' });
  return { ...pageMetadata(locale, '/register', { title: t('metaTitle'), description: t('metaDescription') }), robots: { index: false } };
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const raw = await searchParams;
  const next = typeof raw.next === 'string' ? raw.next : undefined;

  if (await getOwnerSession()) redirect(safeNext(next, locale));

  const labels: AuthLabels = {
    name: t('fields.name'),
    email: t('fields.email'),
    phone: t('fields.phone'),
    phoneHint: t('fields.phoneHint'),
    password: t('fields.password'),
    passwordHint: t('fields.passwordHint'),
    submit: t('register.submit'),
    submitting: t('register.submitting'),
    switchText: t('register.switchText'),
    switchLink: t('register.switchLink'),
    errors: {
      invalid: t('errors.invalid'),
      too_short: t('errors.too_short'),
      too_long: t('errors.too_long'),
      invalid_email: t('errors.invalid_email'),
      invalid_phone: t('errors.invalid_phone'),
      password_too_short: t('errors.password_too_short'),
      email_taken: t('errors.email_taken'),
      rate_limited: t('errors.rate_limited'),
      server_error: t('errors.server_error'),
    },
  };

  return (
    <>
      <PageHero eyebrow={t('register.eyebrow')} title={t('register.title')} subtitle={t('register.subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-[520px]">
          <AuthForm
            mode="register"
            locale={locale}
            next={next}
            labels={labels}
            switchHref={`${href(locale, '/login')}${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          />
        </div>
      </section>
    </>
  );
}
