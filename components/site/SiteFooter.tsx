import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import type { Locale } from '@/i18n/locales';
import { publicSite } from '@/lib/config/site';
import { LanguageSwitcher } from './LanguageSwitcher';
import { href } from './links';

/**
 * The site's footer. On a phone it stays short — the links wrap on two or
 * three lines instead of one per line, their headings kept for screen readers
 * only; from tablet width, the usual columns.
 */
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
        <div className="rounded-xl bg-white px-5 py-7 shadow-card-sm md:px-12 md:py-14">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10">
            <div className="max-w-sm">
              <Wordmark className="h-10 md:h-13" />
              <p className="mt-3 text-sm leading-relaxed text-text-secondary md:mt-4">{t('footer.tagline')}</p>
              <p className="mt-2 text-sm font-bold text-accent md:mt-3">{common('tagline')}</p>
            </div>

            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-bold text-text-muted max-md:sr-only">{column.title}</h2>
                <ul className="flex flex-wrap gap-x-5 md:mt-3 md:flex-col md:gap-0">
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

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between md:mt-10 md:pt-6">
            <p className="text-[13px] text-text-muted">
              {t('footer.rights', { year: new Date().getFullYear(), company: publicSite().companyName })}
            </p>
            <LanguageSwitcher current={locale} label={common('languageSwitcherLabel')} />
          </div>
        </div>
      </div>
    </footer>
  );
}
