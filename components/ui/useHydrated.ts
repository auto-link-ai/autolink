'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server render and hydration, true once React owns the page.
 * Client-only controls (buttons whose onClick does the work) stay disabled
 * until then, so an early tap is never silently lost.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
