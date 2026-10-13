import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { alertTarget } from '@/lib/notifications/alertTarget';

type Props = { params: Promise<{ locale: string; id: string }> };

/**
 * Where a WhatsApp button lands (/alert/{id}; the middleware adds the locale):
 * a reminder opens its car's book, a message alert the inbox — both sign the
 * owner in first if needed. The id is not looked up: nothing here says whether
 * a message or a sticker exists, or whose it is.
 */
function decoded(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    // A stray « % » in a hand-typed link: read it as it is.
    return id;
  }
}

export default async function AlertPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  redirect(alertTarget(locale, decoded(id)));
}
