import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BellIcon, CategoryIcon, CheckIcon, LockIcon, PhoneIcon, ScanIcon, StickerIcon, TruckIcon } from '@/components/site/icons';
import { CtaBand } from '@/components/site/sections/CtaBand';
import { Demo } from '@/components/site/sections/Demo';
import { PrivacyBand } from '@/components/site/sections/PrivacyBand';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { pageMetadata } from '@/lib/site/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'site.pages.howItWorks' });
  return pageMetadata(locale, '/how-it-works', { title: t('metaTitle'), description: t('metaDescription') });
}

const PASSER_BY = [
  { key: 'scan', Icon: ScanIcon },
  { key: 'reason', Icon: CheckIcon },
  { key: 'send', Icon: BellIcon },
] as const;

const OWNER = [
  { key: 'order', Icon: TruckIcon },
  { key: 'activate', Icon: LockIcon },
  { key: 'stick', Icon: StickerIcon },
  { key: 'notify', Icon: PhoneIcon },
] as const;

interface Step {
  Icon: typeof ScanIcon;
  title: string;
  body: string;
}

function StepList({ items }: { items: readonly Step[] }) {
  return (
    <ol className="mt-6 flex flex-col gap-4">
      {items.map(({ Icon, title, body }, index) => (
        <li key={title} className="flex gap-4 rounded-lg bg-white p-5 shadow-card-sm">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon className="h-5 w-5" />
            <span className="absolute -inset-e-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-bold text-white">
              {index + 1}
            </span>
          </span>
          <div>
            <h3 className="font-bold text-text">{title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('site.pages.howItWorks');

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="py-14 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-h2 text-text">{t('passerByTitle')}</h2>
            <p className="mt-2 text-text-secondary">{t('passerByIntro')}</p>
            <StepList
              items={PASSER_BY.map(({ key, Icon }) => ({
                Icon,
                title: t(`passerBy.${key}.title`),
                body: t(`passerBy.${key}.body`),
              }))}
            />
          </div>
          <div>
            <h2 className="text-h2 text-text">{t('ownerTitle')}</h2>
            <p className="mt-2 text-text-secondary">{t('ownerIntro')}</p>
            <StepList
              items={OWNER.map(({ key, Icon }) => ({
                Icon,
                title: t(`owner.${key}.title`),
                body: t(`owner.${key}.body`),
              }))}
            />
            <p className="mt-4 rounded-sm border border-border bg-surface-2 p-4 text-sm leading-relaxed text-text-secondary">
              {t('iosNote')}
            </p>
          </div>
        </div>
      </section>
      <Demo />
      <PrivacyBand />
      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="flex gap-4 rounded-md border border-danger/30 bg-danger/5 p-5 md:p-6">
            <CategoryIcon category="URGENT" className="h-6 w-6 text-danger" />
            <div>
              <h2 className="text-h3 text-text">{t('emergencyTitle')}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{t('emergency')}</p>
            </div>
          </div>
        </div>
      </section>
      <CtaBand locale={locale} />
    </>
  );
}
