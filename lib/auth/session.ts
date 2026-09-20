import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/auth';
import type { Locale } from '@/i18n/locales';
import type { OwnerActor } from '@/lib/db/repositories/actor';
import { usersRepository } from '@/lib/db/repositories/users';

export interface OwnerSession {
  actor: OwnerActor;
  email: string;
}

/**
 * Verifies the session cookie AND that the account still exists and is active
 * (rule 6: a token is only the first gate). Cached per request.
 */
export const getOwnerSession = cache(async (): Promise<OwnerSession | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await usersRepository.findById(userId);
  if (!user || user.status !== 'ACTIVE') return null;
  return { actor: { kind: 'owner', userId: user.id }, email: user.email };
});

/** For customer pages and actions: sends them to sign in, then back here. */
export async function requireOwner(locale: Locale, next?: string): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) {
    const target = next ? `?next=${encodeURIComponent(next)}` : '';
    redirect(`/${locale}/login${target}`);
  }
  return session;
}
