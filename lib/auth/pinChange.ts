import 'server-only';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import { usersRepository } from '@/lib/db/repositories/users';
import { hashPin } from '@/lib/security/pin';
import { clearPinAttempts } from './pinLimits';

const SYSTEM = { kind: 'system' } as const;

/**
 * The one way a PIN changes — chosen by the owner, reset by WhatsApp code, or
 * issued by an admin. Everything signed in with the old one is let go: other
 * sessions end (session version), devices stop receiving alerts until they
 * subscribe again, and the PIN tries already counted for the number are
 * forgotten. Returns false when the account is gone.
 */
export async function replacePin(userId: string, phone: string, pin: string): Promise<boolean> {
  const version = await usersRepository.setPin(userId, await hashPin(pin));
  if (version === null) return false;
  await Promise.all([
    notificationSubscriptionsRepository.removeAllForUser(SYSTEM, userId),
    clearPinAttempts(phone),
  ]);
  return true;
}
