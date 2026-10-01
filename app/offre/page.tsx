import { OFFER_ANCHOR, OFFER_SLICES } from './slices';

/** Where every « اطلب » button goes: the order page, in Arabic like this one. */
const ORDER_PATH = '/ar/order';

/**
 * The ad page: the designer's picture, slice after slice, with a real link laid
 * over each button drawn in it. The first slice loads at once, the rest as the
 * visitor scrolls; every slice declares its size, so nothing jumps meanwhile.
 * No JavaScript of its own.
 */
export default function OfferPage() {
  return (
    <main className="min-h-dvh bg-surface-inverse">
      <h1 className="sr-only">AutoLink — ملصق QR لسيارتك: الناس يتواصلو معاك ورقمك مخبي</h1>
      <div className="mx-auto w-full max-w-150">
        {OFFER_SLICES.map((slice, index) => (
          <section key={slice.src} id={slice.anchor} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- slices are pre-sized WebP, nothing for an optimiser to do */}
            <img
              src={slice.src}
              width={slice.width}
              height={slice.height}
              alt={slice.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              decoding="async"
              className="block h-auto w-full"
            />
            {slice.buttons.map((button) => (
              <a
                key={button.label}
                href={button.to === 'order' ? ORDER_PATH : `#${OFFER_ANCHOR}`}
                aria-label={button.label}
                data-offer-button={button.to}
                className="absolute rounded-full focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{
                  top: `${button.box.top}%`,
                  height: `${button.box.height}%`,
                  left: `${button.box.left}%`,
                  width: `${button.box.width}%`,
                }}
              />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
