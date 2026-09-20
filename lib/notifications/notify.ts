import 'server-only';

/**
 * Tells an owner that a message arrived. Called from `after()`, so nothing here
 * ever delays the person who scanned the sticker, and a failure here must never
 * lose the message — it is already stored and waiting in their inbox.
 *
 * Web push is added in the notifications stage; until then the inbox is the
 * notification.
 */
export async function notifyOwnerOfMessage(_messagePublicId: string): Promise<void> {
  return;
}
