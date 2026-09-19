import { getTranslations } from 'next-intl/server';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';
import { cx } from '@/lib/cx';
import { CategoryIcon } from '../icons';

/**
 * "One sticker, many situations": the six reasons a passer-by can pick,
 * as full-width numbered rows. The third row is highlighted with a sample
 * message chip, the way it arrives on the owner's phone.
 */
export async function Scenarios() {
  const t = await getTranslations('site.scenarios');
  const categories = await getTranslations('scanner.categories');

  return (
    <section aria-labelledby="scenarios-title" className="py-14 md:py-24">
      <div className="container-page grid gap-8 md:grid-cols-2 md:items-end">
        <h2 id="scenarios-title" className="text-h1 text-text">
          {t('title')} <span className="block text-accent">{t('titleAccent')}</span>
        </h2>
        <p className="text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>
      </div>

      <ol className="mt-12 border-t border-border">
        {MESSAGE_CATEGORIES.map((category, index) => {
          const featured = index === 2;
          return (
            <li key={category} className={cx('border-b border-border', featured ? 'bg-accent-soft/60' : 'odd:bg-white/40')}>
              <div className="container-page flex items-center gap-5 py-7 md:py-9">
                <span className={cx('font-mono text-sm font-bold', featured ? 'text-accent' : 'text-text-muted')}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <CategoryIcon
                  category={category}
                  className={cx('h-6 w-6 shrink-0', featured ? 'text-accent' : 'text-text-muted')}
                />
                <h3 className={cx('text-h3 md:text-h2', featured ? 'text-accent' : 'text-text')}>{categories(category)}</h3>
                <p className="ms-auto hidden max-w-[40ch] text-[15px] text-text-secondary lg:block">
                  {t(`items.${category}`)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
