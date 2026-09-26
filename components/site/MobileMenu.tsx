'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { CrossIcon, MenuIcon, UserIcon } from './icons';

export interface NavItem {
  href: string;
  label: string;
  /** A count worth noticing, such as unread messages. Hidden at zero. */
  badge?: number;
}

export interface MenuAccount {
  /** "Connecté": beside the icon from 1024px, and part of the button's name. */
  label: string;
  /** The button's name for a screen reader: "Mon compte". */
  name: string;
  /** Who is signed in, and the sign-out form: the top of the menu. */
  panel: ReactNode;
}

/**
 * Small-screen menu. It remembers the path it was opened on, so any
 * navigation closes it without an effect. Escape closes it too.
 * `always` keeps it on wide screens as well (a signed-in owner's header has
 * their own links to show, so the public pages move in here).
 * With `account`, the button becomes the account button: a person with a
 * green dot, the sign that you are signed in, and the menu opens on who.
 */
export function MobileMenu({
  items,
  openLabel,
  closeLabel,
  orderHref,
  orderLabel,
  footer,
  always = false,
  account,
}: {
  items: NavItem[];
  openLabel: string;
  closeLabel: string;
  orderHref: string;
  orderLabel: string;
  footer: ReactNode;
  always?: boolean;
  account?: MenuAccount;
}) {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  // A dot on the closed menu, so a new message is noticed without opening it.
  const waiting = items.some((item) => (item.badge ?? 0) > 0);

  return (
    <div className={always ? undefined : 'lg:hidden'}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpenedAt(open ? null : pathname)}
        className={
          account
            ? 'relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-surface-3 text-text transition-colors hover:bg-accent-soft lg:px-4'
            : 'relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-accent-soft'
        }
      >
        {open ? (
          <CrossIcon />
        ) : account ? (
          <span className="relative">
            <UserIcon />
            <span
              aria-hidden="true"
              className="absolute -end-1 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-3"
            />
          </span>
        ) : (
          <MenuIcon />
        )}
        {account && (
          <span aria-hidden="true" className="hidden text-[15px] font-bold whitespace-nowrap lg:inline">
            {account.label}
          </span>
        )}
        <span className="sr-only">{open ? closeLabel : account ? `${account.name}, ${account.label}` : openLabel}</span>
        {waiting && !open && (
          <span aria-hidden="true" className="absolute inset-e-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />
        )}
      </button>

      <div
        id="mobile-menu"
        hidden={!open}
        onKeyDown={(event) => event.key === 'Escape' && setOpenedAt(null)}
        className="absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-3xl bg-white p-3 shadow-card-lg lg:inset-x-auto lg:inset-e-0 lg:w-80"
      >
        {account && (
          // Signing out closes the menu; the form carries on in the background.
          <div onSubmit={() => setOpenedAt(null)} className="mb-2 border-b border-border px-4 pt-2 pb-4">
            {account.panel}
          </div>
        )}
        <nav className="flex flex-col">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === pathname ? 'page' : undefined}
              className="flex h-12 items-center rounded-2xl px-4 text-base font-semibold text-text hover:bg-surface-3 aria-[current=page]:text-accent"
            >
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span className="ms-auto rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
          <Link href={orderHref} className={buttonClasses('primary', 'md', 'mt-2 w-full')}>
            {orderLabel}
          </Link>
          <div className="mt-3 flex justify-center border-t border-border pt-3">{footer}</div>
        </nav>
      </div>
    </div>
  );
}
