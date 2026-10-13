import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { href } from '@/components/site/links';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { requireOwner } from '@/lib/auth/session';
import { algiersToday, dueItems, mostUrgent } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { usersRepository } from '@/lib/db/repositories/users';
import { cx } from '@/lib/cx';
import { formatPhone } from '@/lib/format/phone';
import { carName } from '@/lib/vehicles/carName';
import { signOutAction } from '../_auth/actions';
import { AccountSection } from './_components/AccountSection';
import { Inbox } from './_components/Inbox';
import { NotificationsSection } from './_components/NotificationsSection';
import { StickerCard } from './_components/StickerCard';
import { UpcomingDates } from './_components/UpcomingDates';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** The banners an action may come back with: `…invalid` ones are errors. */
const RESULTS: ReadonlySet<string> = new Set(['ok', 'invalid', 'pin_changed', 'reminders_on', 'reminders_off']);

/**
 * The owner's home. Messages first — the reason the product exists — then
 * what is coming up in the car book, the stickers, how they are told
 * (notifications, WhatsApp reminders), and their account.
 */
export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, `/${locale}/dashboard`);
  const t = await getTranslations('dashboard');

  const result = first((await searchParams).result);
  const [tags, messages, unreadByTag, dueByTag, settings, profile] = await Promise.all([
    ownerTagsRepository.listForOwner(session.actor),
    messagesRepository.listForOwner(session.actor),
    messagesRepository.unreadByTag(session.actor),
    carBookRepository.dueForOwner(session.actor),
    getSettings(),
    usersRepository.getProfile(session.actor),
  ]);
  const today = algiersToday();
  const dueFor = (publicTagId: string) => {
    const due = dueByTag.get(publicTagId);
    return due ? dueItems(due, today, settings.careReminderDays) : [];
  };
  const unread = messages.filter((message) => message.status === 'UNREAD').length;

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('hello', { name: session.firstName })} subtitle={t('summary', { count: unread })} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-225">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[15px] text-text-secondary">
            <span dir="ltr" className="whitespace-nowrap">
              {formatPhone(session.phone)}
            </span>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="min-h-11 font-bold text-accent hover:underline">
                {t('signOut')}
              </button>
            </form>
          </div>

          {RESULTS.has(result) && (
            <p
              role="status"
              className={cx(
                'mb-6 rounded-2xl px-5 py-4 text-[15px] font-medium',
                result.endsWith('invalid') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
              )}
            >
              {t(`results.${result as 'ok'}`)}
            </p>
          )}

          {tags.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-card-sm">
              <h2 className="text-h3 text-text">{t('empty.title')}</h2>
              <p className="mx-auto mt-2 max-w-[48ch] text-[15px] leading-relaxed text-text-secondary">
                {t('empty.body')}
              </p>
              <Link href={href(locale, '/activate')} className={buttonClasses('primary', 'md', 'mt-6')}>
                {t('empty.cta')}
              </Link>
            </div>
          ) : (
            <>
              <Inbox messages={messages} locale={locale} />
              <UpcomingDates
                locale={locale}
                cars={tags.map((tag) => ({
                  publicTagId: tag.publicTagId,
                  car: tag.vehicle ? carName(tag.vehicle) : null,
                  items: dueFor(tag.publicTagId).filter((item) => item.status === 'overdue' || item.status === 'soon'),
                }))}
              />

              <section aria-labelledby="stickers">
                <h2 id="stickers" className="mb-1 text-h3 text-text">
                  {t('title')}
                </h2>
                <p className="mb-4 text-[15px] text-text-secondary">{t('subtitle', { count: tags.length })}</p>
                <ul className="flex flex-col gap-5">
                  {tags.map((tag) => (
                    <StickerCard
                      key={tag.publicTagId}
                      tag={tag}
                      locale={locale}
                      // The stranger's view, even though the owner is signed in.
                      scanUrl={`/t/${tag.publicTagId}?view=public`}
                      unread={unreadByTag.get(tag.publicTagId) ?? 0}
                      nextDue={mostUrgent(dueFor(tag.publicTagId))}
                    />
                  ))}
                </ul>
                <Link href={href(locale, '/activate')} className={buttonClasses('secondary', 'md', 'mt-8')}>
                  {t('addAnother')}
                </Link>
              </section>

              <NotificationsSection
                locale={locale}
                phone={session.phone}
                whatsappReminders={profile?.whatsappReminders ?? false}
                reminderDays={settings.careReminderDays}
              />
            </>
          )}

          <AccountSection locale={locale} phone={session.phone} />
        </div>
      </section>
    </>
  );
}
