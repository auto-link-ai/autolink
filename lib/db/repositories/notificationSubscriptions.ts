/**
 * Repository: notificationSubscriptions (web push)
 *
 * SECURITY BOUNDARY — only repositories import models. Subscribe/unsubscribe
 * take an `OwnerActor` and always write `userId: actor.userId`. The delivery
 * pipeline (SystemActor) may read active subscriptions for a message's owner and
 * mark dead endpoints (404/410) inactive. Keys are never returned to a client.
 *
 * Functions are added in Phase 4 (web push).
 */
import 'server-only';

/** Shape accepted from the browser's PushSubscription.toJSON(). */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
