import { getTranslations } from 'next-intl/server';
import { SITE, publicSite } from '@/lib/config/site';
import { PageHero } from './sections/SectionHeading';

interface LegalSection {
  title: string;
  body: string[];
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

/**
 * Privacy policy / terms, rendered from structured copy in the message
 * catalogues. Company details come from lib/config/site.ts (placeholders until
 * launch); a visible notice says the text must be reviewed by a lawyer.
 */
export async function LegalDocument({ doc, period }: { doc: 'privacy' | 'terms'; period: string }) {
  const t = await getTranslations(`legal.${doc}`);
  const legal = await getTranslations('legal');
  const values = {
    company: publicSite().companyName,
    address: SITE.address,
    email: publicSite().contactEmail ?? SITE.contactEmail ?? publicSite().companyName,
    period,
  };
  const sections = t.raw('sections') as LegalSection[];

  return (
    <>
      <PageHero eyebrow={legal('eyebrow')} title={t('title')} subtitle={fill(t('intro'), values)} />
      <section className="py-12 md:py-16">
        <div className="container-page max-w-[800px]">
          <p role="note" className="rounded-sm border border-[#b45309]/30 bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            {legal('draftNotice')}
          </p>
          <div className="mt-8 flex flex-col gap-8">
            {sections.map((section, index) => (
              <div key={section.title}>
                <h2 className="text-h3 text-text">
                  <span className="me-2 font-mono text-accent">{index + 1}.</span>
                  {section.title}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                    {fill(paragraph, values)}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-10 border-t border-border pt-4 text-sm text-text-muted">{legal('updated')}</p>
        </div>
      </section>
    </>
  );
}
