import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { getOwnerSession } from '@/lib/auth/session';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { LanguageSwitcher } from './LanguageSwitcher';
import { href } from './links';
import { MobileMenu, type NavItem } from './MobileMenu';

/** Floating white pill that stays with the page as it scrolls. */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations('site.nav');
  const common = await getTranslations('common');
  const session = await getOwnerSession();
  // Shown on every page, so a new message is noticed without opening the dashboard.
  const unread = session ? await messagesRepository.countUnread(session.actor).catch(() => 0) : 0;

  const items: NavItem[] = [
    { href: href(locale, '/how-it-works'), label: t('howItWorks') },
    { href: href(locale, '/pricing'), label: t('pricing') },
    { href: href(locale, '/faq'), label: t('faq') },
    { href: href(locale, '/contact'), label: t('contact') },
  ];

  return (
    <header className="sticky top-0 z-50 pt-3 md:pt-5">
      <div className="container-page">
        <div className="relative flex h-16 items-center justify-between gap-3 rounded-full bg-white/95 px-3 shadow-card-md backdrop-blur md:h-18 md:px-5">
          <Link href={href(locale, '')} className="rounded-full px-1" aria-label={t('home')}>
            <Wordmark decorative className="h-11 md:h-13" />
          </Link>

          {/* Signed in, the owner's own links take this room; these move into the menu. */}
          <nav aria-label={t('label')} className={session ? 'hidden' : 'hidden lg:block'}>
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher current={locale} label={common('languageSwitcherLabel')} className="hidden md:block" />
            {session ? (
              <>
                <Link
                  href={href(locale, '/dashboard')}
                  className="hidden h-11 items-center gap-2 rounded-full px-4 text-[15px] font-bold whitespace-nowrap text-text hover:bg-surface-3 sm:inline-flex"
                >
                  {t('myStickers')}
                  {unread > 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">
                      <span aria-hidden="true">{unread}</span>
                      <span className="sr-only">{t('unreadMessages', { count: unread })}</span>
                    </span>
                  )}
                </Link>
                {/* The car book: /dashboard/car opens the right car on its own. */}
                <Link
                  href={href(locale, '/dashboard/car')}
                  className="hidden h-11 items-center rounded-full px-4 text-[15px] font-bold whitespace-nowrap text-text hover:bg-surface-3 sm:inline-flex"
                >
                  {t('carBook')}
                </Link>
              </>
            ) : (
              <Link
                href={href(locale, '/login')}
                className="hidden h-11 items-center rounded-full px-4 text-[15px] font-semibold text-text-secondary hover:bg-surface-3 hover:text-text sm:inline-flex"
              >
                {t('signIn')}
              </Link>
            )}
            <Link href={href(locale, '/order')} className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}>
              {t('order')}
            </Link>
            <MobileMenu
              items={[
                ...items,
                ...(session
                  ? [
                      { href: href(locale, '/dashboard'), label: t('myStickers'), badge: unread },
                      { href: href(locale, '/dashboard/car'), label: t('carBook') },
                    ]
                  : [{ href: href(locale, '/login'), label: t('signIn') }]),
              ]}
              openLabel={t('menu')}
              closeLabel={t('closeMenu')}
              orderHref={href(locale, '/order')}
              orderLabel={t('order')}
              footer={<LanguageSwitcher current={locale} label={common('languageSwitcherLabel')} />}
              always={Boolean(session)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
