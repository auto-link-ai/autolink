import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** Eyebrow + h2 + intro, the heading pattern every section uses. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  id,
  center = false,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  id?: string;
  center?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className={cx(center && 'mx-auto text-center', 'max-w-[62ch]')}>
      <p className={cx('eyebrow', inverse && 'text-accent')}>{eyebrow}</p>
      <h2 id={id} className={cx('mt-3 text-h2', inverse ? 'text-text-on-inverse' : 'text-text')}>
        {title}
      </h2>
      {subtitle && (
        <p
          className={cx(
            'mt-4 text-[16px] leading-relaxed md:text-lg',
            inverse ? 'text-text-secondary-on-inverse' : 'text-text-secondary',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Top of an inner page: eyebrow, h1, intro. */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <section className="pb-6 pt-10 md:pb-10 md:pt-16">
      <div className="container-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-[22ch] text-h1 text-text">{title}</h1>
        {subtitle && (
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
