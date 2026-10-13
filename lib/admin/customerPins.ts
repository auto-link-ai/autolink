import 'server-only';
import { randomInt } from 'node:crypto';
import { clearPinAttempts } from '@/lib/auth/pinLimits';
import type { AdminActor } from '@/lib/db/repositories/actor';
import { adminCustomersRepository } from '@/lib/db/repositories/customersAdmin';
import { adminCustomersQueries } from '@/lib/db/repositories/customersAdminQueries';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import { hashPin } from '@/lib/security/pin';
import { isWeakPin } from '@/lib/validation/pin';

const SYSTEM = { kind: 'system' } as const;

/**
 * Support, for an owner who calls: a temporary PIN read out over the phone, or
 * simply clearing the tries that locked them out. Only an ADMIN may do either;
 * the caller checks the role, as for every other account change.
 */

/** A random PIN that passes the owner's own rules; the plaintext is returned once. */
export async function issueTemporaryPin(admin: AdminActor, publicUserId: string): Promise<string | null> {
  const target = await adminCustomersQueries.getForAdmin(admin, publicUserId);
  if (!target) return null;
  let pin: string;
  do pin = String(randomInt(0, 10_000)).padStart(4, '0');
  while (isWeakPin(pin, target.phone));

  const result = await adminCustomersRepository.setTemporaryPin(admin, publicUserId, await hashPin(pin));
  if (!result.ok) return null;
  // As with any new PIN: devices stop receiving alerts, counted tries are forgotten.
  await Promise.all([
    notificationSubscriptionsRepository.removeAllForUser(SYSTEM, result.userId),
    clearPinAttempts(result.phone),
  ]);
  return pin;
}

/** The owner remembers their PIN but tried too often: let them in again now. */
export async function unlockPin(admin: AdminActor, publicUserId: string): Promise<boolean> {
  const target = await adminCustomersQueries.getForAdmin(admin, publicUserId);
  if (!target) return false;
  await clearPinAttempts(target.phone);
  await adminCustomersRepository.recordPinUnlock(admin, publicUserId);
  return true;
}
