import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { routing } from '@/i18n/routing';
import { activationDonePath } from '@/lib/activation/state';
import { requireOwner } from '@/lib/auth/session';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import { carName } from '@/lib/vehicles/carName';
import { ActivationDone } from '../ActivationDone';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'activate' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * « C'est activé » — where activation ends, and where scanning your own
 * already-active sticker's activation link leads. Only for the sticker's
 * owner: anyone else's sticker, or an unknown one, goes back to /activate,
 * which says what it says for every sticker it cannot activate.
 */
export default async function ActivationDonePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const raw = await searchParams;
  const publicTagId = normalizeTagIdInput(typeof raw.t === 'string' ? raw.t : '');
  if (!publicTagId) redirect(`/${locale}/activate`);
  const session = await requireOwner(locale, activationDonePath(locale, publicTagId));
  const tag = (await ownerTagsRepository.listForOwner(session.actor)).find((row) => row.publicTagId === publicTagId);
  if (!tag) redirect(`/${locale}/activate?t=${encodeURIComponent(publicTagId)}`);

  const t = await getTranslations('activate');
  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('steps.done')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-160">
          <ActivationDone
            locale={locale}
            publicTagId={tag.publicTagId}
            car={tag.vehicle ? carName(tag.vehicle) : null}
            pinUpdated={raw.pin === '1'}
          />
        </div>
      </section>
    </>
  );
}
