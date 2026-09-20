'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { savePushSubscriptionAction } from '../actions';

export interface NotifyLabels {
  title: string;
  body: string;
  enable: string;
  working: string;
  enabled: string;
  denied: string;
  unsupported: string;
  failed: string;
}

type State = 'checking' | 'unsupported' | 'off' | 'on' | 'denied' | 'failed';

/** base64url (what VAPID keys look like) → the bytes the browser wants. */
function toKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Asks the browser to notify this owner when someone writes about their car.
 * Rendered only when the server has push keys; without permission the inbox
 * still works, so this never blocks anything.
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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then(async (registration) => {
        const existing = await registration?.pushManager.getSubscription();
        setState(existing ? 'on' : 'off');
      })
      .catch(() => setState('off'));
  }, []);

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toKeyBytes(publicKey),
      });

      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        setState('failed');
        return;
      }

      const form = new FormData();
      form.set('locale', locale);
      form.set('endpoint', json.endpoint);
      form.set('p256dh', json.keys.p256dh);
      form.set('auth', json.keys.auth);
      startTransition(async () => {
        const result = await savePushSubscriptionAction(form);
        setState(result.ok ? 'on' : 'failed');
      });
    } catch (error) {
      console.error('[push] could not subscribe:', error);
      setState('failed');
    }
  }

  if (state === 'checking' || state === 'on') {
    return state === 'on' ? (
      <p className="mb-6 rounded-2xl bg-success/10 px-5 py-4 text-[15px] font-medium text-success">{labels.enabled}</p>
    ) : null;
  }

  return (
    <div className="mb-6 rounded-2xl bg-surface-3 px-5 py-4">
      <p className="text-[15px] font-bold text-text">{labels.title}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{labels.body}</p>
      {state === 'denied' ? (
        <p className="mt-3 text-sm text-text-muted">{labels.denied}</p>
      ) : state === 'unsupported' ? (
        <p className="mt-3 text-sm text-text-muted">{labels.unsupported}</p>
      ) : (
        <>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={enable} disabled={pending}>
            {pending ? labels.working : labels.enable}
          </Button>
          {state === 'failed' && <p className="mt-2 text-sm text-danger">{labels.failed}</p>}
        </>
      )}
    </div>
  );
}
