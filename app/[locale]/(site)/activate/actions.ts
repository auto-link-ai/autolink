'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { claimTag } from '@/lib/activation/claim';
import { afterLink, linkPath } from '@/lib/activation/claimLink';
import { getOwnerSession } from '@/lib/auth/session';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { normalizeTagIdInput } from '@/lib/validation/tagId';

/**
 * « Lier cet autocollant à mon compte »: the one tap on the scan page and on
 * /activate. Signed out, it sends them to create an account first — which
 * then links the sticker by itself. Everything is re-checked here.
 */
export async function linkStickerAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const publicTagId = normalizeTagIdInput(String(formData.get('tagId') ?? ''));
  if (!publicTagId) redirect(`/${locale}/activate?error=invalid`);

  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/register?next=${encodeURIComponent(linkPath(locale, publicTagId))}`);

  let destination: string;
  try {
    const outcome = await claimTag(session.actor, publicTagId, { ipHash: hashIp(getClientIp(await headers())) });
    destination = afterLink(locale, publicTagId, outcome);
  } catch (error) {
    console.error('[activate] failed:', error instanceof Error ? error.message : error);
    destination = afterLink(locale, publicTagId, { ok: false, reason: 'server_error' });
  }
  redirect(destination);
}
