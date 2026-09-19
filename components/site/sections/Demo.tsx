import { getTranslations } from 'next-intl/server';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';
import { CategoryIcon, CheckIcon } from '../icons';

/**
 * Product demonstration: the page a passer-by actually gets after scanning,
 * drawn as a phone mock-up. The mock UI is decorative (aria-hidden); the text
 * beside it carries the meaning.
 */
export async function Demo() {
  const t = await getTranslations('site.demo');
  const categories = await getTranslations('scanner.categories');

  return (
    <section aria-labelledby="demo-title" className="bg-surface-2 py-14 md:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div aria-hidden="true" className="mx-auto w-full max-w-[320px]">
          <div className="rounded-4xl border-10 border-[#e8d9cd] bg-white p-3 shadow-card-lg">
            <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-semibold text-text-muted">
              <span>9:41</span>
              <span className="h-4 w-16 rounded-full bg-[#e8d9cd]" />
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-[#e8d9cd]" />
                <span className="h-2 w-2 rounded-full bg-[#e8d9cd]" />
              </span>
            </div>

            <div className="rounded-3xl bg-accent p-4 text-accent-ink">
              <p className="text-[15px] font-bold leading-snug">{t('screen.heading')}</p>
              <p className="mt-1 text-[11px] opacity-90">{t('screen.subheading')}</p>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                <span className="text-[13px] font-bold text-text">{t('screen.vehicle')}</span>
                <span className="font-mono text-[10px] text-text-muted">AUT-7K3M9QXZ</span>
              </div>
            </div>

            <p className="mt-4 px-1 text-[12px] font-bold text-text">{t('screen.question')}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {MESSAGE_CATEGORIES.slice(0, 5).map((category, index) => (
                <li
                  key={category}
                  className={cx(
                    'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-[11px] font-semibold',
                    index === 0 ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      index === 0 ? 'border-accent bg-accent text-white' : 'border-border-strong',
                    )}
                  >
                    {index === 0 && <CheckIcon className="h-3 w-3" />}
                  </span>
                  <CategoryIcon category={category} className="h-4 w-4" />
                  {categories(category)}
                </li>
              ))}
            </ul>

            <p className="mt-3 px-1 text-[12px] font-bold text-text">{t('screen.noteLabel')}</p>
            <div className="mt-1 rounded-2xl border border-border px-3 py-2 text-[11px] text-text-muted">
              {t('screen.notePlaceholder')}
            </div>
            <div className="mt-3 flex h-11 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-ink">
              {t('screen.send')}
            </div>
          </div>
        </div>

        <div>
          <h2 id="demo-title" className="text-h1 text-text">
            {t('title')}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {(['scan', 'pick', 'notify'] as const).map((key) => (
              <li key={key} className="flex gap-3 text-[15px] text-text">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                {t(`points.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
