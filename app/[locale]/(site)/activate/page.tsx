import type { Metadata } from 'next';
import Link from 'next/link';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { StickerIcon } from '@/components/site/icons';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { activationDonePath } from '@/lib/activation/state';
import { getOwnerSession } from '@/lib/auth/session';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { scannerTagsRepository } from '@/lib/db/repositories/tagsScanner';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import { codeHelpHref, codeLabels } from '../_auth/codeLabels';
import { INPUT } from '../_auth/fields';
import { authErrorLabels } from '../_auth/labels';
import { ActivationWizard } from './ActivationWizard';
import { AddStickerForm } from './AddStickerForm';
import { activationLabels } from './labels';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'activate' });
  return { title: t('metaTitle'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/**
 * Where a new sticker leads: scanning one nobody has activated yet lands here
 * (/t/[tagId] redirects). Signed out, it is the activation screen; signed in,
 * just the car. Someone whose camera will not scan types the id printed under
 * the QR. Every sticker that cannot be activated — unknown, someone else's,
 * deactivated — gets the same answer (rule 9).
 */
export default async function ActivatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('activate');

  const typed = first((await searchParams).t);
  const publicTagId = normalizeTagIdInput(typed);
  const [owner, tag] = await Promise.all([
    getOwnerSession(),
    publicTagId ? scannerTagsRepository.findForScanner(publicTagId) : Promise.resolve(null),
  ]);
  // The owner's own, already active sticker: say so, and open its car book.
  const mine =
    owner && tag?.state === 'linked'
      ? (await ownerTagsRepository.listForOwner(owner.actor)).some((row) => row.publicTagId === tag.publicTagId)
      : false;

  // Their own, already active sticker: the « C'est activé » page says what to do next.
  if (mine && tag) redirect(activationDonePath(locale, tag.publicTagId));

  let body: React.ReactNode;
  if (!typed) {
    body = (
      <form method="get" className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-card-sm md:p-8">
        <label htmlFor="act-tag" className="text-sm font-bold text-text">
          {t('fields.tagId')}
        </label>
        <input
          id="act-tag"
          name="t"
          required
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="AUT-"
          className={`${INPUT} font-mono rtl:text-end`}
        />
        <span className="text-sm text-text-muted">{t('fields.tagIdHint')}</span>
        <button type="submit" className={buttonClasses('primary', 'md', 'w-full')}>
          {t('manual.submit')}
        </button>
      </form>
    );
  } else if (tag?.state !== 'waiting') {
    body = (
      <div role="alert" className="rounded-xl bg-white p-6 shadow-card-sm md:p-8">
        <p className="text-[15px] font-medium text-danger">{t('errors.invalid')}</p>
        <Link href={`/${locale}/activate`} className={buttonClasses('secondary', 'md', 'mt-5')}>
          {t('manual.retry')}
        </Link>
      </div>
    );
  } else {
    const labels = await activationLabels();
    const errors = { ...(await authErrorLabels()), ...labels.errors };
    body = owner ? (
      <AddStickerForm
        locale={locale}
        tagId={tag.publicTagId}
        labels={{ car: labels.wizard.carLabels, submit: labels.signedIn.submit, submitting: labels.signedIn.submitting, errors }}
      />
    ) : (
      <ActivationWizard
        locale={locale}
        tagId={tag.publicTagId}
        helpHref={await codeHelpHref(locale)}
        labels={{ ...labels.wizard, code: await codeLabels(), errors }}
      />
    );
  }

  return (
    <>
      <PageHero
        eyebrow={t('eyebrow')}
        title={owner && tag?.state === 'waiting' ? t('signedIn.title') : t('title')}
        subtitle={t('subtitle')}
      />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-160">
          {publicTagId && tag?.state === 'waiting' && (
            <p className="mb-5 flex items-center gap-3 text-[15px] text-text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <StickerIcon className="h-5 w-5" />
              </span>
              {t('sticker')}
              <span dir="ltr" className="font-mono font-bold text-accent">
                {tag.publicTagId}
              </span>
            </p>
          )}
          {body}
          {!typed && <p className="mt-6 rounded-2xl bg-surface-3 px-5 py-4 text-[15px] leading-relaxed text-text-secondary">{t('help')}</p>}
        </div>
      </section>
    </>
  );
}
