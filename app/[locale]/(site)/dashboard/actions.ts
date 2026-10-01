'use server';

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getOwnerSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/config/settings';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { usersRepository } from '@/lib/db/repositories/users';
import { hashSecret, verifySecret } from '@/lib/security/password';
import { changePasswordSchema, fieldErrors, ownerPhoneSchema, type ChangePasswordField } from '@/lib/validation/auth';
import type { ChangePasswordState } from './passwordState';
import { notificationSubscriptionsRepository } from '@/lib/db/repositories/notificationSubscriptions';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { sendPush } from '@/lib/notifications/push';
import type { SavePushResult } from './pushState';
import { vehiclesRepository } from '@/lib/db/repositories/vehicles';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import { vehicleSchema } from '@/lib/validation/vehicle';

function back(locale: string, result: string): never {
  redirect(`/${locale}/dashboard?result=${result}`);
}

/** The owner turning their own sticker off (or back on). */
export async function toggleStickerAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const publicTagId = formData.get('publicTagId');
  const next = formData.get('next');
  if (!isValidTagIdShape(publicTagId) || (next !== 'ACTIVE' && next !== 'DEACTIVATED')) back(locale, 'invalid');

  const result = await ownerTagsRepository.setOwnerStatus(session.actor, publicTagId, next);
  back(locale, result.ok ? 'ok' : 'invalid');
}

/**
 * The owner changing their own password. The current one is checked first,
 * and the check is rate-limited like sign-in, so this form cannot be used to
 * guess a password on an unattended, signed-in phone.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const parsed = changePasswordSchema.safeParse({
    current: formData.get('current') ?? '',
    next: formData.get('next') ?? '',
  });
  if (!parsed.success) {
    return { status: 'error', fieldErrors: fieldErrors<ChangePasswordField>(parsed.error) };
  }

  try {
    const settings = await getSettings();
    const hit = await rateLimitsRepository.hit(
      `pwchange:user:${session.actor.userId}`,
      settings.rateLimitOwnerLoginPerHour,
      60 * 60 * 1000,
    );
    if (!hit.allowed) return { status: 'error', formError: 'rate_limited' };

    const stored = await usersRepository.passwordHashFor(session.actor);
    if (!stored || !(await verifySecret(stored, parsed.data.current))) {
      return { status: 'error', fieldErrors: { current: 'wrong_current' } };
    }
    const result = await usersRepository.setOwnPasswordHash(session.actor, await hashSecret(parsed.data.next));
    return result.ok ? { status: 'done' } : { status: 'error', formError: 'server_error' };
  } catch (error) {
    console.error('[dashboard] password change failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }
}

/**
 * Stores this browser's push subscription against the signed-in owner — on
 * every dashboard visit, so a browser always belongs to whoever signed in on it
 * last. Returns a result rather than redirecting: the panel stays where it is.
 *
 * With `confirm`, the owner has just switched notifications on: one test
 * notification goes to this browser only, so they see it work straight away.
 */
export async function savePushSubscriptionAction(formData: FormData): Promise<SavePushResult> {
  const session = await getOwnerSession();
  if (!session) return { ok: false };

  const locale = toLocale(formData.get('locale'));
  const endpoint = String(formData.get('endpoint') ?? '');
  const p256dh = String(formData.get('p256dh') ?? '');
  const auth = String(formData.get('auth') ?? '');
  // Endpoints are push-service URLs; anything else is not worth storing.
  if (!endpoint.startsWith('https://') || !p256dh || !auth) return { ok: false };
  const target = { endpoint, keys: { p256dh, auth } };

  try {
    const saved = await notificationSubscriptionsRepository.save(session.actor, target);
    if (!saved.ok || formData.get('confirm') !== '1') return saved;

    const settings = await getSettings();
    const hit = await rateLimitsRepository.hit(
      `pushconfirm:user:${session.actor.userId}`,
      settings.rateLimitOwnerLoginPerHour,
      60 * 60 * 1000,
    );
    if (!hit.allowed) return { ok: true };

    const t = await getTranslations({ locale, namespace: 'notifications.confirm' });
    const outcome = await sendPush([target], { title: t('title'), body: t('body'), url: `/${locale}/dashboard` });
    return { ok: true, confirmed: outcome.sent > 0 };
  } catch (error) {
    console.error('[dashboard] saving a push subscription failed:', error instanceof Error ? error.message : error);
    return { ok: false };
  }
}

/** Mark a message read, or archive it. Only the owner's own messages move. */
export async function setMessageStatusAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const publicId = String(formData.get('publicId') ?? '');
  const status = formData.get('status');
  if (!publicId || (status !== 'READ' && status !== 'ARCHIVED')) back(locale, 'invalid');

  const result = await messagesRepository.setStatus(session.actor, publicId, status);
  back(locale, result.ok ? 'ok' : 'invalid');
}

/** Edit the car attached to a sticker. */
export async function updateVehicleAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const vehicleId = String(formData.get('vehicleId') ?? '');
  const parsed = vehicleSchema.safeParse({
    brand: formData.get('brand') ?? '',
    model: formData.get('model') ?? '',
    color: formData.get('color') ?? '',
    plateNumber: formData.get('plateNumber') ?? '',
    showDetailsPublicly: formData.get('showDetailsPublicly') ?? undefined,
  });
  if (!parsed.success) back(locale, 'invalid');

  // The repository filters by ownerId: someone else's vehicle simply does not update.
  const result = await vehiclesRepository.update(session.actor, vehicleId, parsed.data);
  back(locale, result.ok ? 'ok' : 'invalid');
}

/** The owner's own WhatsApp number: added after an old sign-up, or changed later. */
export async function savePhoneAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const parsed = ownerPhoneSchema.safeParse({ phone: formData.get('phone') ?? '' });
  if (!parsed.success) back(locale, 'phone_invalid');
  const result = await usersRepository.updateProfile(session.actor, { phone: parsed.data.phone });
  back(locale, result.ok ? 'phone_saved' : 'phone_invalid');
}
