'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { tagListReturnPath } from '@/lib/admin/tagListQuery';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { adminTagEditsRepository } from '@/lib/db/repositories/tagsAdminEdit';
import { TAG_ACTIONS } from '@/lib/domain/constants';
import { tagIdSchema } from '@/lib/validation/tagId';
import { hashSecret } from '@/lib/security/password';

const inputSchema = z.object({
  publicTagId: tagIdSchema,
  action: z.enum(TAG_ACTIONS),
});

/** Suspend / deactivate / reactivate / mark lost. Re-checks the admin session itself. */
export async function changeTagStatusAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);

  const returnSearch = formData.get('returnSearch');
  const parsed = inputSchema.safeParse({
    publicTagId: formData.get('publicTagId'),
    action: formData.get('action'),
  });
  if (!parsed.success) redirect(tagListReturnPath(locale, returnSearch, 'not_found'));

  const result = await tagsRepository.transition(session.actor, parsed.data.publicTagId, parsed.data.action);
  redirect(tagListReturnPath(locale, returnSearch, result.ok ? 'ok' : result.reason));
}

const BATCH_PUBLIC_ID = /^B-[0-9A-HJKMNP-TV-Z]{8}$/;

/** Deleting and taking back need the ADMIN role — checked here, whatever the page showed. */
async function requireAdminRole(formData: FormData) {
  const locale = toLocale(formData.get('locale'));
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  const returnSearch = formData.get('returnSearch');
  if (session.actor.role !== 'ADMIN') redirect(tagListReturnPath(locale, returnSearch, 'forbidden'));
  return { session, locale, returnSearch };
}

/** One never-used sticker, deleted. */
export async function deleteTagAction(formData: FormData): Promise<void> {
  const { session, locale, returnSearch } = await requireAdminRole(formData);
  const id = tagIdSchema.safeParse(formData.get('publicTagId'));
  if (!id.success) redirect(tagListReturnPath(locale, returnSearch, 'not_found'));
  const result = await adminTagEditsRepository.removeUnused(session.actor, id.data);
  redirect(tagListReturnPath(locale, returnSearch, result.ok ? 'deleted' : result.reason));
}

/** A batch's never-used stickers, deleted; the batch too once it is empty. */
export async function cleanBatchAction(formData: FormData): Promise<void> {
  const { session, locale, returnSearch } = await requireAdminRole(formData);
  const batchPublicId = formData.get('batchPublicId');
  if (typeof batchPublicId !== 'string' || !BATCH_PUBLIC_ID.test(batchPublicId)) {
    redirect(tagListReturnPath(locale, returnSearch, 'not_found'));
  }
  const result = await adminTagEditsRepository.removeUnusedInBatch(session.actor, batchPublicId);
  redirect(tagListReturnPath(locale, returnSearch, result.ok ? 'cleaned' : result.reason));
}

/**
 * A sticker taken back from its customer. Its old activation code is replaced
 * by a random one nobody knows, so the old slip stops working.
 */
export async function takeBackTagAction(formData: FormData): Promise<void> {
  const { session, locale, returnSearch } = await requireAdminRole(formData);
  const id = tagIdSchema.safeParse(formData.get('publicTagId'));
  if (!id.success) redirect(tagListReturnPath(locale, returnSearch, 'not_found'));
  const disabledCodeHash = await hashSecret(randomBytes(24).toString('base64url'));
  const result = await adminTagEditsRepository.takeBack(session.actor, id.data, disabledCodeHash);
  redirect(tagListReturnPath(locale, returnSearch, result.ok ? 'taken_back' : result.reason));
}
