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
import { cx } from '@/lib/cx';
import { formatPhone } from '@/lib/format/phone';
import { authErrorLabels } from '../_auth/labels';
import { signOutAction } from '../_auth/actions';
import { pushPublicKey } from '@/lib/notifications/push';
import { ChangePin } from './_components/ChangePin';
import { Inbox } from './_components/Inbox';
import { NotifyToggle } from './_components/NotifyToggle';
import { StickerCard } from './_components/StickerCard';

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
const RESULTS: ReadonlySet<string> = new Set(['ok', 'invalid', 'pin_changed']);

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, `/${locale}/dashboard`);
  const t = await getTranslations('dashboard');

  const raw = await searchParams;
  const result = first(raw.result);
  const [tags, messages, unreadByTag, dueByTag, settings] = await Promise.all([
    ownerTagsRepository.listForOwner(session.actor),
    messagesRepository.listForOwner(session.actor),
    messagesRepository.unreadByTag(session.actor),
    carBookRepository.dueForOwner(session.actor),
    getSettings(),
  ]);
  const pushKey = pushPublicKey();
  const today = algiersToday();
  const nextDue = (publicTagId: string) => {
    const due = dueByTag.get(publicTagId);
    return due ? mostUrgent(dueItems(due, today, settings.careReminderDays)) : null;
  };

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle', { count: tags.length })} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-225">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[15px] text-text-secondary">
            <span>
              {t('hello', { name: session.firstName })} ·{' '}
              <span dir="ltr" className="whitespace-nowrap">{formatPhone(session.phone)}</span>
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

          {/* First thing after signing in: without it, a message waits until they look. */}
          {tags.length > 0 && pushKey && (
            <NotifyToggle
              locale={locale}
              publicKey={pushKey}
              labels={{
                title: t('notify.title'),
                body: t('notify.body'),
                enable: t('notify.enable'),
                working: t('notify.working'),
                enabled: t('notify.enabled'),
                confirmFailed: t('notify.confirmFailed'),
                denied: t('notify.denied'),
                deniedHelp: t('notify.deniedHelp'),
                iosInstall: t('notify.iosInstall'),
                insecure: t('notify.insecure'),
                unsupported: t('notify.unsupported'),
                failed: t('notify.failed'),
              }}
            />
          )}

          {tags.length > 0 && <Inbox messages={messages} locale={locale} />}

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
              <ul className="flex flex-col gap-5">
                {tags.map((tag) => (
                  <StickerCard
                    key={tag.publicTagId}
                    tag={tag}
                    locale={locale}
                    // The stranger's view, even though the owner is signed in.
                    scanUrl={`/t/${tag.publicTagId}?view=public`}
                    unread={unreadByTag.get(tag.publicTagId) ?? 0}
                    nextDue={nextDue(tag.publicTagId)}
                  />
                ))}
              </ul>
              <Link href={href(locale, '/activate')} className={buttonClasses('secondary', 'md', 'mt-8')}>
                {t('addAnother')}
              </Link>
            </>
          )}

          <section aria-labelledby="account" className="mt-12">
            <h2 id="account" className="mb-4 text-h3 text-text">
              {t('account.title')}
            </h2>
            <div className="mb-4 rounded-xl bg-white p-6 shadow-card-sm">
              <p className="text-sm font-bold text-text">{t('account.phone')}</p>
              <p dir="ltr" className="mt-1 text-[17px] font-bold text-text rtl:text-end">
                {formatPhone(session.phone)}
              </p>
              <p className="mt-1 text-sm text-text-muted">{t('account.phoneHint')}</p>
            </div>
            <ChangePin
              locale={locale}
              labels={{
                title: t('account.changePin'),
                current: t('account.current'),
                pin: t('account.newPin'),
                pinHint: t('account.pinHint'),
                pinConfirm: t('account.pinConfirm'),
                submit: t('account.submit'),
                working: t('account.working'),
                errors: { ...(await authErrorLabels()), wrong_current: t('account.wrongCurrent'), same_pin: t('account.samePin') },
              }}
            />
          </section>
        </div>
      </section>
    </>
  );
}
