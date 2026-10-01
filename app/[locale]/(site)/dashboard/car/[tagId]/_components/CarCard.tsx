import type { ReactNode } from 'react';
import { CarPicture } from '@/components/care/CarPicture';
import { PendingLink } from '@/components/ui/PendingLink';
import { carName } from '@/lib/vehicles/carName';

/**
 * The car at the top of its book, and in the list when there are several:
 * its drawing in its colour, make and model, the plate as on the car, and
 * one more line (the car's details, or what is coming up). The whole card
 * is the link.
 */
export function CarCard({
  href,
  car,
  detail,
  aside,
  fallbackName,
}: {
  href: string;
  /** « Votre voiture », while the owner has not said which car it is. */
  fallbackName: string;
  car: { brand: string; model: string; color: string; plateNumber?: string | null };
  detail?: string | null;
  /** At the end of the card, before the arrow: a pill, on the list of cars. */
  aside?: ReactNode;
}) {
  return (
    <PendingLink
      href={href}
      className="flex min-h-24 items-center gap-3 rounded-xl bg-white px-4 py-4 shadow-card-sm transition-shadow hover:shadow-card-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:px-5"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] leading-snug font-bold text-text">
          {carName(car) ?? fallbackName}
        </span>
        {car.plateNumber ? (
          <span
            dir="ltr"
            className="mt-1 inline-block rounded-md border border-border-strong bg-white px-2 py-0.5 font-mono text-sm font-semibold tracking-wide text-text"
          >
            {car.plateNumber}
          </span>
        ) : (
          car.color && <span className="mt-0.5 block text-sm text-text-muted">{car.color}</span>
        )}
        {detail && <span className="mt-1 block truncate text-sm text-text-secondary">{detail}</span>}
      </span>
      {aside}
      <CarPicture colour={car.color} className="w-28 sm:w-36" />
      <span aria-hidden="true" className="inline-block text-2xl leading-none text-text-muted rtl:rotate-180">
        ›
      </span>
    </PendingLink>
  );
}
