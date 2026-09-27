import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { signOutAction } from '@/app/[locale]/(site)/_auth/actions';
import { Wordmark } from '@/components/Wordmark';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { getOwnerSession, type OwnerSession } from '@/lib/auth/session';
import { algiersToday, countDueSoon } from '@/lib/care/due';
import { getSettings } from '@/lib/config/settings';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { LanguageSwitcher } from './LanguageSwitcher';
import { InstallApp } from './InstallApp';
import { href } from './links';
import { BackButton } from './BackButton';
import { MobileMenu, type MenuAccount, type NavItem } from './MobileMenu';
import { OwnerBar, OwnerTabs, type OwnerNavItem } from './OwnerNav';

/** The numbers on the owner's two tabs. A failed count shows no badge, never an error. */
async function ownerCounts(session: OwnerSession) {
  const [unread, due] = await Promise.all([
    messagesRepository.countUnread(session.actor).catch(() => 0),
    Promise.all([carBookRepository.dueForOwner(session.actor), getSettings()])
      .then(([dueByTag, settings]) => countDueSoon(dueByTag.values(), algiersToday(), settings.careReminderDays))
      .catch(() => ({ count: 0, late: false })),
  ]);
  return { unread, due };
}

/** Top of the menu, signed in: who, and the way out. The email is only ever shown to its owner. */
async function accountOf(session: OwnerSession, locale: Locale): Promise<MenuAccount> {
  const [t, tDashboard] = await Promise.all([getTranslations('site.nav'), getTranslations('dashboard')]);
  return {
    label: t('signedIn'),
    name: t('account'),
    panel: (
      <>
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
          {t('signedInAs')}
        </p>
        <p dir="ltr" className="mt-0.5 truncate text-[15px] font-bold text-text rtl:text-end">
          {session.email}
        </p>
        <form action={signOutAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonClasses('secondary', 'sm', 'w-full')}>
            {tDashboard('signOut')}
          </button>
        </form>
      </>
    ),
  };
}

/** Floating white pill that stays with the page as it scrolls. */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations('site.nav');
  const common = await getTranslations('common');
  const tInstall = await getTranslations('site.install');
  const installLabels = {
    button: tInstall('button'),
    iosTitle: tInstall('iosTitle'),
    iosShare: tInstall('iosShare'),
    iosAdd: tInstall('iosAdd'),
    iosConfirm: tInstall('iosConfirm'),
    iosDone: tInstall('iosDone'),
  };
  const session = await getOwnerSession();
  // Shown on every page, so a new message or a date coming up is noticed without looking for it.
  const [counts, account] = session
    ? await Promise.all([ownerCounts(session), accountOf(session, locale)])
    : [null, undefined];
  const ownerItems: OwnerNavItem[] = counts
    ? [
        {
          section: 'stickers',
          href: href(locale, '/dashboard'),
          label: t('myStickers'),
          badge: counts.unread,
          badgeLabel: t('unreadMessages', { count: counts.unread }),
        },
        {
          // /dashboard/car opens the right car on its own.
          section: 'carBook',
          href: href(locale, '/dashboard/car'),
          label: t('carBook'),
          badge: counts.due.count,
          badgeLabel: t('carBookDue', { count: counts.due.count }),
          urgent: counts.due.late,
        },
      ]
    : [];

  const items: NavItem[] = [
    { href: href(locale, '/how-it-works'), label: t('howItWorks') },
    { href: href(locale, '/pricing'), label: t('pricing') },
    { href: href(locale, '/faq'), label: t('faq') },
    { href: href(locale, '/contact'), label: t('contact') },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 pt-3 md:pt-5">
        <div className="container-page">
          <div className="relative flex h-16 items-center justify-between gap-3 rounded-full bg-white/95 px-3 shadow-card-md backdrop-blur md:h-18 md:px-5">
            <div className="flex items-center gap-2">
              <BackButton locale={locale} label={t('back')} />
              <Link href={href(locale, '')} className="rounded-full px-1" aria-label={t('home')}>
                <Wordmark decorative className="h-11 md:h-13" />
              </Link>
            </div>

            {/* Signed in, the owner's own links take this room; these move into the menu. */}
            <nav aria-label={t('label')} className={session ? 'hidden' : 'hidden xl:block'}>
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
              {/* Signed in, the owner's tabs need the room; the switcher is in the menu too. */}
              <LanguageSwitcher
                current={locale}
                label={common('languageSwitcherLabel')}
                className={session ? 'hidden xl:block' : 'hidden md:block'}
              />
              {session ? (
                <OwnerTabs locale={locale} items={ownerItems} label={t('owner')} />
              ) : (
                <>
                  {/* From 1280px a visitor has no menu, so the install button sits in the bar. */}
                  <InstallApp labels={installLabels} variant="header" />
                  <Link
                    href={href(locale, '/login')}
                    className="hidden h-11 items-center rounded-full px-4 text-[15px] font-semibold text-text-secondary hover:bg-surface-3 hover:text-text sm:inline-flex"
                  >
                    {t('signIn')}
                  </Link>
                </>
              )}
              {/* In the iPhone app the back arrow needs the room; ordering stays in the menu. */}
              <Link
                href={href(locale, '/order')}
                className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex ios-app:hidden!')}
              >
                {t('order')}
              </Link>
              <MobileMenu
                // Signed in, the owner's two sections are always on screen: tabs or the bottom bar.
                items={session ? items : [...items, { href: href(locale, '/login'), label: t('signIn') }]}
                openLabel={t('menu')}
                closeLabel={t('closeMenu')}
                orderHref={href(locale, '/order')}
                orderLabel={t('order')}
                footer={<LanguageSwitcher current={locale} label={common('languageSwitcherLabel')} />}
                always={Boolean(session)}
                account={account}
                install={<InstallApp labels={installLabels} />}
              />
            </div>
          </div>
        </div>
      </header>
      {/* Outside the header: its blurred pill would trap a fixed child inside it. */}
      {session && <OwnerBar locale={locale} items={ownerItems} label={t('owner')} />}
    </>
  );
}
