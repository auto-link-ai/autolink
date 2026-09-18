import type { ReactNode } from 'react';

/**
 * Pass-through root layout. <html>/<body> are rendered by the two real roots:
 * app/[locale]/layout.tsx (all localized routes) and, from Phase 2,
 * app/t/layout.tsx (the prefix-free scanner page), because each needs its own
 * `lang`/`dir` and script budget.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
