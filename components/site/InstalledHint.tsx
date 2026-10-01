'use client';

import { useSyncExternalStore } from 'react';
import { CheckIcon } from './icons';

const subscribe = () => () => {};

/** Opened from the home screen rather than a browser tab. */
function isInstalledApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * On the sign-in page, only inside the installed app: an iPhone keeps the app's
 * sign-in apart from Safari's, so a new home-screen app starts signed out. This
 * says it happens once. Nothing on the server, nothing in a browser tab.
 */
export function InstalledHint({ text }: { text: string }) {
  const installed = useSyncExternalStore(subscribe, isInstalledApp, () => false);
  if (!installed) return null;
  return (
    <p className="mb-6 flex items-start gap-3 rounded-2xl bg-accent-soft px-5 py-4 text-[15px] font-semibold text-text">
      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      {text}
    </p>
  );
}
