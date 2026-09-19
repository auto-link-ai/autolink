'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { ADMIN_COOKIE_NAME, adminCookieOptions } from '@/lib/admin/cookie';

export async function adminLogoutAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  // Overwrite with an expired cookie using the same attributes (__Host- requires Secure + Path=/).
  (await cookies()).set(ADMIN_COOKIE_NAME, '', { ...adminCookieOptions, maxAge: 0 });
  redirect(`/${locale}/admin/login`);
}
