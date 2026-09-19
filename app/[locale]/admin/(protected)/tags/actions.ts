'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getAdminSession } from '@/lib/admin/auth';
import { tagListReturnPath } from '@/lib/admin/tagListQuery';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { TAG_ACTIONS } from '@/lib/domain/constants';
import { tagIdSchema } from '@/lib/validation/tagId';

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
