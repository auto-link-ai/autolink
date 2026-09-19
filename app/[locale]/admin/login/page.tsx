import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { routing } from '@/i18n/routing';
import { getAdminSession } from '@/lib/admin/auth';
import { adminLoginAction } from './actions';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function AdminLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  if (await getAdminSession()) redirect(`/${locale}/admin/tags`);

  const { error } = await searchParams;
  const errorKey = error === 'invalid' || error === 'throttled' ? error : null;
  const t = await getTranslations('admin.login');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-4 py-14">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-6 shadow-card-md md:p-8">
        <Wordmark />
        <h1 className="mt-6 text-h2 text-text">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>

        {errorKey && (
          <p role="alert" className="mt-5 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {t(`errors.${errorKey}`)}
          </p>
        )}

        <form action={adminLoginAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <Field id="email" name="email" type="email" label={t('email')} autoComplete="username" required dir="ltr" />
          <Field
            id="password"
            name="password"
            type="password"
            label={t('password')}
            autoComplete="current-password"
            required
            dir="ltr"
          />
          <Button type="submit" className="mt-2 w-full">
            {t('submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
