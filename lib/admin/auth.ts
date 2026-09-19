import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Locale } from '@/i18n/locales';
import type { AdminActor } from '@/lib/db/repositories/actor';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { ADMIN_COOKIE_NAME } from './cookie';
import { openAdminSession } from './sessionToken';

export interface AdminSession {
  actor: AdminActor;
  email: string;
}

/**
 * Verifies the session cookie AND that the admin still exists (rule 6: the
 * middleware's cookie check is only a first gate). The role comes from the
 * database, not from the token. Cached per request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const claims = await openAdminSession(token, process.env.AUTH_SECRET);
  if (!claims) return null;
  const admin = await adminUsersRepository.findById(claims.sub);
  if (!admin) return null;
  return { actor: { kind: 'admin', adminId: claims.sub, role: admin.role }, email: admin.email };
});

/** For admin pages and server actions: redirects to the login page when not signed in. */
export async function requireAdmin(locale: Locale): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}/admin/login`);
  return session;
}
