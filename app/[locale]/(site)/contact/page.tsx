import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, ScanIcon } from '@/components/site/icons';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { SITE, publicSite } from '@/lib/config/site';
import { pageMetadata } from '@/lib/site/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'site.pages.contact' });
  return pageMetadata(locale, '/contact', { title: t('metaTitle'), description: t('metaDescription') });
}

function Channel({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-md border border-border bg-surface p-5 shadow-card-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-accent">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-muted">{label}</p>
        <div className="mt-1 break-words text-[16px] font-semibold text-text">{children}</div>
      </div>
    </li>
  );
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('site.pages.contact');
  // Placeholders never reach this page: an unset channel is simply not listed.
  const site = publicSite();

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="py-14 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <ul className="grid gap-4 sm:grid-cols-2">
            {site.contactEmail && (
              <Channel icon={<MailIcon />} label={t('email')}>
                <a href={`mailto:${site.contactEmail}`} dir="ltr" className="text-accent hover:underline">
                  {site.contactEmail}
                </a>
              </Channel>
            )}
            {site.phone && (
              <Channel icon={<PhoneIcon />} label={t('phone')}>
                <a href={`tel:${site.phone.replace(/\s/g, '')}`} dir="ltr" className="text-accent hover:underline">
                  {site.phone}
                </a>
              </Channel>
            )}
            {site.whatsapp && (
              <Channel icon={<PhoneIcon />} label={t('whatsapp')}>
                <a href={`https://wa.me/${site.whatsapp}`} dir="ltr" className="text-accent hover:underline" rel="noopener noreferrer">
                  +{site.whatsapp}
                </a>
              </Channel>
            )}
            {!site.contactEmail && !site.phone && !site.whatsapp && (
              <Channel icon={<MailIcon />} label={t('email')}>
                <span className="font-normal text-text-secondary">{t('comingSoon')}</span>
              </Channel>
            )}
            <Channel icon={<ClockIcon />} label={t('hours')}>
              {SITE.hours[locale]}
            </Channel>
            {site.address && (
              <Channel icon={<PinIcon />} label={t('address')}>
                {site.companyName}
                <span className="block font-normal text-text-secondary">{site.address}</span>
              </Channel>
            )}
          </ul>

          <aside className="h-fit rounded-md border border-border bg-surface-2 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-surface text-accent">
              <ScanIcon />
            </span>
            <h2 className="mt-4 text-h3 text-text">{t('ownerNoticeTitle')}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t('ownerNotice')}</p>
          </aside>
        </div>
      </section>
    </>
  );
}
