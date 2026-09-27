'use client';

import { usePathname } from 'next/navigation';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { BookIcon, StickerIcon } from './icons';
import { ownerSectionOf, type OwnerSection } from './ownerSection';

export interface OwnerNavItem {
  section: OwnerSection;
  href: string;
  label: string;
  /** A number worth noticing — unread messages, dates coming up. Hidden at zero. */
  badge: number;
  /** What the number means, for a screen reader: "3 unread messages". */
  badgeLabel: string;
  /** Red instead of orange: something is already late. */
  urgent?: boolean;
}

const ICONS = { stickers: StickerIcon, carBook: BookIcon } as const;

/** Where the owner is: `page` on the section's own address, `true` anywhere inside it. */
function useCurrent(locale: Locale) {
  const pathname = usePathname();
  const section = ownerSectionOf(pathname, locale);
  return (item: OwnerNavItem) =>
    item.section !== section ? undefined : pathname === item.href ? ('page' as const) : ('true' as const);
}

/**
 * The count on a tab. `announce: false` when the badge sits before the label
 * (on the icon, in the bar): the link then says it after its name instead,
 * so a screen reader hears "Car book, 2 dates coming up" — name first.
 */
function Badge({ item, className, announce = true }: { item: OwnerNavItem; className?: string; announce?: boolean }) {
  if (item.badge <= 0) return null;
  return (
    <span
      aria-hidden={announce ? undefined : true}
      className={cx(
        'inline-block min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-bold',
        item.urgent ? 'bg-danger text-white' : 'bg-accent text-accent-ink',
        className,
      )}
    >
      <span aria-hidden="true">{item.badge}</span>
      {announce && <span className="sr-only">{item.badgeLabel}</span>}
    </span>
  );
}

/**
 * From 768px up, in the header: the owner's two sections as tabs on one grey
 * track, the current one white and raised. On a public page neither is lit.
 */
export function OwnerTabs({ locale, items, label }: { locale: Locale; items: OwnerNavItem[]; label: string }) {
  const currentOf = useCurrent(locale);
  return (
    <nav aria-label={label} className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full bg-surface-3 p-1">
        {items.map((item) => {
          const Icon = ICONS[item.section];
          const current = currentOf(item);
          return (
            <li key={item.section}>
              <PendingLink
                href={item.href}
                aria-current={current}
                className={cx(
                  'inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-bold whitespace-nowrap transition-colors',
                  current ? 'bg-white text-text shadow-card-sm' : 'text-text-secondary hover:bg-white/60 hover:text-text',
                )}
              >
                <Icon className={cx('h-5 w-5', current && 'text-accent')} />
                {item.label}
                <Badge item={item} />
              </PendingLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Below 768px: the same two sections in a bar fixed to the bottom of the
 * screen, under the thumb on every page. It steps aside while a field has
 * focus (see `.owner-bar` in globals.css), so it never rides on the keyboard.
 */
export function OwnerBar({ locale, items, label }: { locale: Locale; items: OwnerNavItem[]; label: string }) {
  const currentOf = useCurrent(locale);
  return (
    <nav
      aria-label={label}
      data-owner-bar=""
      className="owner-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const Icon = ICONS[item.section];
          const current = currentOf(item);
          return (
            <li key={item.section} className="flex-1">
              <PendingLink
                href={item.href}
                aria-current={current}
                // Orange like the site's other links; the current one also sits on a soft pill.
                className={cx(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 px-2 pt-2 pb-1.5 text-[13px] text-accent',
                  current ? 'font-bold' : 'font-semibold',
                )}
                spinnerClassName="absolute top-2.5 inset-e-3 h-3.5 w-3.5"
              >
                <span
                  className={cx(
                    'relative inline-flex h-8 w-16 items-center justify-center rounded-full transition-colors',
                    current && 'bg-accent-soft',
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <Badge item={item} announce={false} className="absolute -top-1.5 inset-e-0.5 ring-2 ring-white" />
                </span>
                {item.label}
                {item.badge > 0 && <span className="sr-only">{item.badgeLabel}</span>}
              </PendingLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
