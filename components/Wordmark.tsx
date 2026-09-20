import { BRAND_ASSETS, type BrandVariant } from '@/lib/brand';
import { cx } from '@/lib/cx';

/**
 * The AutoLink logo, served from `public/brand/` as the supplied SVG artwork:
 * `full` is the lockup (mark + name), `mark` is the bubble on its own for
 * small square places. A plain <img> rather than next/image — an SVG is not
 * something the image optimiser can improve, and this keeps the logo at zero
 * JavaScript on every page that shows it.
 *
 * Pass `decorative` when the surrounding link or heading already names it.
 */
export function Wordmark({
  className = '',
  variant = 'full',
  decorative = false,
}: {
  className?: string;
  variant?: BrandVariant;
  decorative?: boolean;
}) {
  const asset = BRAND_ASSETS[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG asset: nothing for next/image to optimise.
    <img
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={decorative ? '' : 'AutoLink'}
      className={cx('block h-12 w-auto shrink-0', className)}
    />
  );
}
