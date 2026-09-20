import 'server-only';
import webpush from 'web-push';
import { notificationSubscriptionsRepository, type PushTarget } from '@/lib/db/repositories/notificationSubscriptions';

/**
 * Web push over VAPID. The payload is deliberately thin — a title, a line, and
 * where to go — because a notification is read on a lock screen, in public.
 *
 * With no keys configured this does nothing and says so once: the message is
 * already saved, and the owner's inbox is the fallback.
 */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface PushOutcome {
  sent: number;
  failed: number;
  skipped: boolean;
}

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() || 'mailto:notifications@autolink.dz';
  if (!publicKey || !privateKey) {
    console.warn('[push] WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY are not set — notifications are off.');
    configured = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.WEB_PUSH_PUBLIC_KEY?.trim() && process.env.WEB_PUSH_PRIVATE_KEY?.trim());
}

/**
 * The VAPID public key, handed to the browser by the dashboard. Public by
 * design — it is what identifies this server to the push service — so it needs
 * no NEXT_PUBLIC_ twin.
 */
export function pushPublicKey(): string | null {
  return process.env.WEB_PUSH_PUBLIC_KEY?.trim() || null;
}

/** Sends to every device of one owner, and prunes the ones that have gone. */
export async function sendPush(targets: PushTarget[], payload: PushPayload): Promise<PushOutcome> {
  if (targets.length === 0) return { sent: 0, failed: 0, skipped: false };
  if (!ensureConfigured()) return { sent: 0, failed: 0, skipped: true };

  const body = JSON.stringify(payload);
  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        await webpush.sendNotification(target, body, { TTL: 6 * 60 * 60 });
        await notificationSubscriptionsRepository.recordSuccess(target.endpoint);
        return { ok: true as const };
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped this subscription for good.
        await notificationSubscriptionsRepository.recordFailure(target.endpoint, status === 404 || status === 410);
        return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );

  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    skipped: false,
  };
}
