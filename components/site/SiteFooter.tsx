import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import type { Locale } from '@/i18n/locales';
import { SITE } from '@/lib/config/site';
import { LanguageSwitcher } from './LanguageSwitcher';
import { href } from './links';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('site');
  const common = await getTranslations('common');

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { href: href(locale, '/how-it-works'), label: t('nav.howItWorks') },
        { href: href(locale, '/pricing'), label: t('nav.pricing') },
        { href: href(locale, '/order'), label: t('nav.order') },
        { href: href(locale, '/faq'), label: t('nav.faq') },
        { href: href(locale, '/contact'), label: t('nav.contact') },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { href: href(locale, '/privacy'), label: t('footer.privacy') },
        { href: href(locale, '/terms'), label: t('footer.terms') },
      ],
    },
  ];

  return (
    <footer className="pb-8 pt-6">
      <div className="container-page">
        <div className="rounded-xl bg-white px-6 py-10 shadow-card-sm md:px-12 md:py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-sm">
              <Wordmark className="h-13" />
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">{t('footer.tagline')}</p>
              <p className="mt-3 text-sm font-bold text-accent">{common('tagline')}</p>
            </div>

            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-bold text-text-muted">{column.title}</h2>
                <ul className="mt-3 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-10 items-center text-[15px] text-text-secondary hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-text-muted">
              {t('footer.rights', { year: new Date().getFullYear(), company: SITE.companyName })}
            </p>
            <LanguageSwitcher current={locale} label={common('languageSwitcherLabel')} />
          </div>
        </div>
      </div>
    </footer>
  );
}
