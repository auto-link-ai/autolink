'use client';

import { useState, useSyncExternalStore } from 'react';
import { isIosDevice } from '@/lib/notifications/support';
import { installMode, type InstallMode } from '@/lib/pwa/install';
import { DownloadIcon, ShareIcon } from './icons';

export interface InstallLabels {
  button: string;
  iosTitle: string;
  iosShare: string;
  iosAdd: string;
  iosConfirm: string;
  iosDone: string;
}

/** Chrome's install offer. Not in TypeScript's DOM types: it is not a web standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// The browser makes its offer once, soon after the page loads — often before
// anyone opens the menu. So it is caught here, when this code first runs.
let offer: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Our button makes the offer, instead of the browser's own banner.
    event.preventDefault();
    offer = event as BeforeInstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    justInstalled = true;
    changed();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentMode(): InstallMode {
  const nav = navigator as Navigator & { standalone?: boolean };
  return installMode({
    standalone: justInstalled || window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    ios: isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    canPrompt: offer !== null,
  });
}

const BUTTON =
  'flex h-12 w-full items-center gap-3 rounded-2xl bg-accent-soft px-4 text-base font-bold text-accent transition-colors hover:bg-surface-3';
// A round icon, like the menu button: the bar (1200px at most) has no room for the words.
// No display here: each use sets its own, since `hidden` must not fight `inline-flex`.
const HEADER_BUTTON =
  'h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-accent transition-colors hover:bg-accent-soft';

async function install() {
  const event = offer;
  if (!event) return;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The offer can only be used once; a refusal leaves no dead button behind.
  offer = null;
  if (outcome === 'accepted') justInstalled = true;
  changed();
}

function IosSteps({ id, labels, hidden, className }: { id: string; labels: InstallLabels; hidden: boolean; className: string }) {
  return (
    <div id={id} hidden={hidden} className={className}>
      <p className="text-sm font-bold text-text">{labels.iosTitle}</p>
      <ol className="mt-2 flex flex-col gap-2 text-[15px] text-text">
        {[labels.iosShare, labels.iosAdd, labels.iosConfirm].map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">
              {i + 1}
            </span>
            {i === 0 && <ShareIcon className="h-5 w-5 text-accent" />}
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-text-secondary">{labels.iosDone}</p>
    </div>
  );
}

/**
 * « Installer l'application ». One tap opens the browser's install window
 * where there is one; on an iPhone it shows the three Share-menu steps; once
 * installed, or where installing is impossible, it is not there at all.
 *
 * `menu`: at the top of the header menu. `header`: in the header bar itself,
 * from 1280px, for visitors not signed in — they have no menu at that width.
 */
export function InstallApp({ labels, variant = 'menu' }: { labels: InstallLabels; variant?: 'menu' | 'header' }) {
  // On the server nothing is known about the phone: render nothing, then decide.
  const mode = useSyncExternalStore(subscribe, currentMode, () => 'none' as const);
  const [stepsOpen, setStepsOpen] = useState(false);

  if (mode === 'installed' || mode === 'none') return null;

  if (mode === 'prompt') {
    return (
      <button
        type="button"
        title={variant === 'header' ? labels.button : undefined}
        className={variant === 'header' ? `${HEADER_BUTTON} hidden xl:inline-flex` : BUTTON}
        onClick={install}
      >
        <DownloadIcon />
        {variant === 'header' ? <span className="sr-only">{labels.button}</span> : labels.button}
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <div className="relative hidden xl:block">
        <button
          type="button"
          title={labels.button}
          className={`${HEADER_BUTTON} inline-flex`}
          aria-expanded={stepsOpen}
          aria-controls="install-steps-header"
          onClick={() => setStepsOpen(!stepsOpen)}
        >
          <DownloadIcon />
          <span className="sr-only">{labels.button}</span>
        </button>
        <IosSteps
          id="install-steps-header"
          labels={labels}
          hidden={!stepsOpen}
          className="absolute inset-e-0 top-[calc(100%+0.75rem)] z-10 w-80 rounded-3xl bg-white p-4 shadow-card-lg"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={BUTTON}
        aria-expanded={stepsOpen}
        aria-controls="install-steps"
        onClick={() => setStepsOpen(!stepsOpen)}
      >
        <DownloadIcon />
        {labels.button}
      </button>
      <IosSteps id="install-steps" labels={labels} hidden={!stepsOpen} className="px-4 pt-3 pb-1" />
    </div>
  );
}
