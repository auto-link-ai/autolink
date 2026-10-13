import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

/**
 * There is no separate sign-up any more: an account is made by activating a
 * sticker (scan it, or type its id). Old links land on that page.
 */
export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  redirect(`/${locale}/activate`);
}
