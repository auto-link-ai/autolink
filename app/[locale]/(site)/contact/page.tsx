import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, ScanIcon } from '@/components/site/icons';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { SITE } from '@/lib/config/site';
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

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="py-14 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <ul className="grid gap-4 sm:grid-cols-2">
            {SITE.contactEmail && (
              <Channel icon={<MailIcon />} label={t('email')}>
                <a href={`mailto:${SITE.contactEmail}`} dir="ltr" className="text-accent hover:underline">
                  {SITE.contactEmail}
                </a>
              </Channel>
            )}
            {SITE.phone && (
              <Channel icon={<PhoneIcon />} label={t('phone')}>
                <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} dir="ltr" className="text-accent hover:underline">
                  {SITE.phone}
                </a>
              </Channel>
            )}
            {SITE.whatsapp && (
              <Channel icon={<PhoneIcon />} label={t('whatsapp')}>
                <a href={`https://wa.me/${SITE.whatsapp}`} dir="ltr" className="text-accent hover:underline" rel="noopener noreferrer">
                  +{SITE.whatsapp}
                </a>
              </Channel>
            )}
            <Channel icon={<ClockIcon />} label={t('hours')}>
              {SITE.hours[locale]}
            </Channel>
            <Channel icon={<PinIcon />} label={t('address')}>
              {SITE.companyName}
              <span className="block font-normal text-text-secondary">{SITE.address}</span>
            </Channel>
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
