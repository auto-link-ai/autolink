import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; id: string }> };

/**
 * Where the WhatsApp alert's button lands (/alert/{message publicId}; the
 * middleware adds the locale). The inbox is on the dashboard, which signs the
 * owner in first if needed. The id is not looked up: nothing here says whether
 * a message exists, or whose it is.
 */
export default async function AlertPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  redirect(`/${locale}/dashboard`);
}
