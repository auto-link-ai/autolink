'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import { GearIcon, GridIcon, StickerIcon, TruckIcon, UsersIcon } from '@/components/site/icons';
import type { Locale } from '@/i18n/locales';
import {
  ADMIN_SECTIONS,
  adminSectionHref,
  currentAdminSection,
  type AdminSection,
} from '@/lib/admin/sections';
import { cx } from '@/lib/cx';

const ICONS: Record<AdminSection, ComponentType<SVGProps<SVGSVGElement>>> = {
  overview: GridIcon,
  orders: TruckIcon,
  tags: StickerIcon,
  customers: UsersIcon,
  settings: GearIcon,
};

/**
 * The five sections, shared by the sidebar and the small-screen bar so they can
 * never drift apart. The active one is filled in and carries aria-current.
 */
export function AdminNav({
  locale,
  pending,
  labels,
  layout,
}: {
  locale: Locale;
  /** Orders waiting to be confirmed; shown as a badge so a new one is never missed. */
  pending: number;
  labels: Record<AdminSection, string>;
  layout: 'sidebar' | 'bar';
}) {
  const current = currentAdminSection(usePathname());
  const sidebar = layout === 'sidebar';

  // The bar wraps rather than scrolls: a section hidden off-screen is a section nobody finds.
  return (
    <ul className={cx('flex gap-1', sidebar ? 'flex-col' : 'flex-wrap items-center')}>
      {ADMIN_SECTIONS.map((section) => {
        const Icon = ICONS[section];
        const active = section === current;
        return (
          <li key={section}>
            <Link
              href={adminSectionHref(locale, section)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'inline-flex items-center gap-2.5 rounded-sm text-sm font-semibold transition-colors',
                sidebar ? 'w-full px-3 py-2.5' : 'px-3 py-2',
                active ? 'bg-accent text-accent-ink' : 'text-text hover:bg-surface-2',
              )}
            >
              <Icon className={cx('h-4.5 w-4.5', active ? 'opacity-90' : 'text-text-muted')} />
              {labels[section]}
              {section === 'orders' && pending > 0 && (
                <span
                  className={cx(
                    'ms-auto rounded-full px-2 py-0.5 text-xs font-bold',
                    active ? 'bg-accent-ink/15 text-accent-ink' : 'bg-accent text-accent-ink',
                  )}
                >
                  {pending}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
