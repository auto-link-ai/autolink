import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { href } from '@/components/site/links';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { getOwnerSession } from '@/lib/auth/session';
import { codeHelpHref, codeLabels } from '../_auth/codeLabels';
import { authErrorLabels } from '../_auth/labels';
import { ForgotPinForm } from './ForgotPinForm';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'auth.forgot' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/** « Code PIN oublié ? »: a WhatsApp code to the number, then a new PIN — and signed in. */
export default async function ForgotPinPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (await getOwnerSession()) redirect(`/${locale}/dashboard`);
  const t = await getTranslations('auth');

  return (
    <>
      <PageHero eyebrow={t('forgot.eyebrow')} title={t('forgot.title')} subtitle={t('forgot.subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-130">
          <ForgotPinForm
            locale={locale}
            helpHref={await codeHelpHref(locale)}
            labels={{
              phone: t('fields.phone'),
              phoneHint: t('forgot.phoneHint'),
              sendCode: t('forgot.sendCode'),
              sending: t('forgot.sending'),
              newPin: t('fields.newPin'),
              newPinHint: t('fields.pinHint'),
              pinConfirm: t('fields.pinConfirm'),
              submit: t('forgot.submit'),
              submitting: t('forgot.submitting'),
              // Never "sent to": a number with no account receives nothing, and the page must not tell.
              code: { ...(await codeLabels()), sentTo: t('forgot.sentTo') },
              errors: await authErrorLabels(),
            }}
          />
          <p className="mt-5 text-[15px] text-text-secondary">
            <Link href={href(locale, '/login')} className="font-bold text-accent hover:underline">
              {t('forgot.backToLogin')}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
