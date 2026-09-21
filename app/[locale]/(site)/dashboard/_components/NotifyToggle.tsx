'use client';

import { useEffect, useState } from 'react';
import { BellIcon } from '@/components/site/icons';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { isIosDevice, pushSupport, sameKey, toKeyBytes, type PushSupport } from '@/lib/notifications/support';
import { savePushSubscriptionAction } from '../actions';
import type { SavePushResult } from '../pushState';

export interface NotifyLabels {
  title: string;
  body: string;
  enable: string;
  working: string;
  enabled: string;
  confirmFailed: string;
  denied: string;
  deniedHelp: string;
  iosInstall: string;
  insecure: string;
  unsupported: string;
  failed: string;
}

type State = 'checking' | Exclude<PushSupport, 'ready'> | 'denied' | 'off' | 'working' | 'on' | 'failed';

function readSupport(): PushSupport {
  const nav = navigator as Navigator & { standalone?: boolean };
  return pushSupport({
    secure: window.isSecureContext,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    ios: isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
  });
}

/**
 * Subscribes this browser (reusing its subscription when it still matches the
 * server's key) and files it under whoever is signed in. Needs permission
 * already granted; asks for nothing itself.
 */
async function linkThisBrowser(publicKey: string, locale: Locale, confirm: boolean): Promise<SavePushResult> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const key = toKeyBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  // Made with an older key: the browser will not subscribe again until it goes.
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { ok: false };

  const form = new FormData();
  form.set('locale', locale);
  form.set('endpoint', json.endpoint);
  form.set('p256dh', json.keys.p256dh);
  form.set('auth', json.keys.auth);
  if (confirm) form.set('confirm', '1');
  return savePushSubscriptionAction(form);
}

/**
 * The first thing an owner sees after signing in. Browsers only ask "allow
 * notifications?" after a tap, so this asks clearly, once. A browser that
 * already said yes is linked to the signed-in account with no tap at all.
 * Without notifications the inbox still works, so nothing here blocks.
 */
export function NotifyToggle({
  locale,
  publicKey,
  labels,
}: {
  locale: Locale;
  publicKey: string;
  labels: NotifyLabels;
}) {
  const [state, setState] = useState<State>('checking');
  const [confirmFailed, setConfirmFailed] = useState(false);

  useEffect(() => {
    const support = readSupport();
    if (support !== 'ready') return setState(support);
    if (Notification.permission === 'denied') return setState('denied');
    if (Notification.permission === 'default') return setState('off');

    let cancelled = false;
    linkThisBrowser(publicKey, locale, false)
      .then((result) => !cancelled && setState(result.ok ? 'on' : 'failed'))
      .catch((error) => {
        console.error('[push] could not link this browser:', error);
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, locale]);

  async function enable() {
    setState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off');

      const result = await linkThisBrowser(publicKey, locale, true);
      setConfirmFailed(result.ok && result.confirmed === false);
      setState(result.ok ? 'on' : 'failed');
    } catch (error) {
      console.error('[push] could not subscribe:', error);
      setState('failed');
    }
  }

  if (state === 'checking') return null;

  if (state === 'on') {
    return (
      <div role="status" className="mb-6 rounded-2xl bg-success/10 px-5 py-4 text-[15px] font-medium text-success">
        <p>{labels.enabled}</p>
        {confirmFailed && <p className="mt-1 font-normal text-text-secondary">{labels.confirmFailed}</p>}
      </div>
    );
  }

  const canAsk = state === 'off' || state === 'working' || state === 'failed';
  const note: Partial<Record<State, string>> = {
    denied: labels.denied,
    'ios-install': labels.iosInstall,
    insecure: labels.insecure,
    unsupported: labels.unsupported,
  };

  return (
    <section aria-labelledby="notify-title" className="mb-6 rounded-xl border border-accent/40 bg-accent-soft p-5 md:p-6">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
          <BellIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="notify-title" className="text-[17px] font-bold text-text">
            {labels.title}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{labels.body}</p>

          {canAsk ? (
            <>
              <Button type="button" className="mt-4" onClick={enable} disabled={state === 'working'}>
                {state === 'working' ? labels.working : labels.enable}
              </Button>
              {state === 'failed' && (
                <p role="alert" className="mt-2 text-sm font-medium text-danger">
                  {labels.failed}
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-[15px] font-medium text-text">{note[state]}</p>
          )}
          {state === 'denied' && <p className="mt-1 text-sm text-text-secondary">{labels.deniedHelp}</p>}
        </div>
      </div>
    </section>
  );
}
