'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { getSettings } from '@/lib/config/settings';
import { blockedMessagesRepository } from '@/lib/db/repositories/blockedMessages';
import { notifyOwnerOfMessage } from '@/lib/notifications/notify';

const BLOCKED_ID = /^BLK-[0-9A-HJKMNP-TV-Z]{10}$/;

/** Both actions reach a customer or remove evidence: ADMIN role only, checked here. */
async function requireAdminFor(formData: FormData) {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const back = (result: string) => `/${locale}/admin/blocked?result=${result}`;
  if (session.actor.role !== 'ADMIN') redirect(back('forbidden'));
  const publicId = formData.get('publicId');
  if (typeof publicId !== 'string' || !BLOCKED_ID.test(publicId)) redirect(back('not_found'));
  return { session, publicId, back };
}

/** Removes a blocked message from the list. */
export async function deleteBlockedAction(formData: FormData): Promise<void> {
  const { session, publicId, back } = await requireAdminFor(formData);
  const result = await blockedMessagesRepository.remove(session.actor, publicId);
  redirect(back(result.ok ? 'deleted' : 'not_found'));
}

/** Gemini was wrong: the message goes to the owner, with the usual notification. */
export async function deliverBlockedAction(formData: FormData): Promise<void> {
  const { session, publicId, back } = await requireAdminFor(formData);
  const settings = await getSettings();
  const result = await blockedMessagesRepository.deliver(session.actor, publicId, settings.messageRetentionDays);
  if (!result.ok) redirect(back(result.reason));
  const messagePublicId = result.messagePublicId;
  after(() => notifyOwnerOfMessage(messagePublicId));
  redirect(back('delivered'));
}
