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
import { messagesRepository } from '@/lib/db/repositories/messages';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { cx } from '@/lib/cx';
import { siteOrigin } from '@/lib/site/seo';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import { signOutAction } from '../_auth/actions';
import { Inbox } from './_components/Inbox';
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

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireOwner(locale, `/${locale}/dashboard`);
  const t = await getTranslations('dashboard');

  const raw = await searchParams;
  const activated = first(raw.activated);
  const result = first(raw.result);
  const [tags, messages, unreadByTag] = await Promise.all([
    ownerTagsRepository.listForOwner(session.actor),
    messagesRepository.listForOwner(session.actor),
    messagesRepository.unreadByTag(session.actor),
  ]);
  const origin = siteOrigin().toString().replace(/\/$/, '');

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle', { count: tags.length })} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-225">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[15px] text-text-secondary">
            <span dir="ltr">{session.email}</span>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="min-h-11 font-bold text-accent hover:underline">
                {t('signOut')}
              </button>
            </form>
          </div>

          {isValidTagIdShape(activated) && (
            <p role="status" className="mb-6 rounded-2xl bg-success/10 px-5 py-4 text-[15px] font-medium text-success">
              {t('activated', { tagId: activated })}
            </p>
          )}
          {(result === 'ok' || result === 'invalid') && (
            <p
              role="status"
              className={cx(
                'mb-6 rounded-2xl px-5 py-4 text-[15px] font-medium',
                result === 'ok' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
              )}
            >
              {t(`results.${result}`)}
            </p>
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
                    scanUrl={`${origin}/t/${tag.publicTagId}`}
                    unread={unreadByTag.get(tag.publicTagId) ?? 0}
                  />
                ))}
              </ul>
              <Link href={href(locale, '/activate')} className={buttonClasses('secondary', 'md', 'mt-8')}>
                {t('addAnother')}
              </Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
