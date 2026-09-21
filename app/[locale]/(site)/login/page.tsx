import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { href } from '@/components/site/links';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getOwnerSession } from '@/lib/auth/session';
import { pageMetadata } from '@/lib/site/seo';
import { claimTagIdFromNext } from '@/lib/activation/claimLink';
import { AuthForm, type AuthLabels } from '../_auth/AuthForm';
import { ClaimWelcome } from '../_auth/ClaimWelcome';
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

  const claimTagId = claimTagIdFromNext(next);
  const registerHref = `${href(locale, '/register')}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const labels: AuthLabels = {
    email: t('fields.email'),
    password: t('fields.password'),
    show: t('fields.show'),
    hide: t('fields.hide'),
    forgot: t('login.forgot'),
    forgotLink: t('login.forgotLink'),
    forgotHref: href(locale, '/contact'),
    submit: t('login.submit'),
    submitting: t('login.submitting'),
    switchText: t('login.switchText'),
    switchLink: t('login.switchLink'),
    errors: {
      invalid: t('errors.invalid'),
      invalid_credentials: t('errors.invalid_credentials'),
      rate_limited: t('errors.rate_limited'),
      server_error: t('errors.server_error'),
    },
  };

  return (
    <>
      <PageHero eyebrow={t('login.eyebrow')} title={t('login.title')} subtitle={t('login.subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-130">
          {claimTagId && (
            <ClaimWelcome
              tagId={claimTagId}
              title={t('claim.loginTitle')}
              body={t('claim.loginBody')}
              cta={{ label: t('claim.loginCta'), href: registerHref, secondary: t('claim.loginSecondary') }}
            />
          )}
          <AuthForm mode="login" locale={locale} next={next} labels={labels} switchHref={registerHref} />
        </div>
      </section>
    </>
  );
}
