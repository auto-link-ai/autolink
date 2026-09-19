import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Note: `Link`/`useRouter`/`usePathname` are client components that need a
// <NextIntlClientProvider> above them. No layout mounts one yet (it would ship
// the runtime to every page), so server components use `next/link` with an
// explicit `/${locale}/…` path instead.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
