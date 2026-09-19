'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { toLocale, type Locale } from '@/i18n/locales';
import { ADMIN_COOKIE_NAME, adminCookieOptions } from '@/lib/admin/cookie';
import { sealAdminSession } from '@/lib/admin/sessionToken';
import { getSettings } from '@/lib/config/settings';
import { adminUsersRepository } from '@/lib/db/repositories/adminUsers';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { getClientIp, hashForKey, hashIp } from '@/lib/security/ipHash';
import { hashSecret, verifySecret } from '@/lib/security/password';

const HOUR_MS = 60 * 60 * 1000;
const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
let timingDecoy: Promise<string> | null = null;

function fail(locale: Locale, error: 'invalid' | 'throttled'): never {
  redirect(`/${locale}/admin/login?error=${error}`);
}

export async function adminLoginAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const { rateLimitAdminLoginPerHour: limit } = await getSettings();

  const ipHash = hashIp(getClientIp(await headers()));
  const ipHit = await rateLimitsRepository.hit(`adminlogin:ip:${ipHash}`, limit, HOUR_MS);

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) fail(locale, ipHit.allowed ? 'invalid' : 'throttled');
  const { email, password } = parsed.data;

  const emailHit = await rateLimitsRepository.hit(`adminlogin:email:${hashForKey('admin-email', email)}`, limit, HOUR_MS);
  if (!ipHit.allowed || !emailHit.allowed) fail(locale, 'throttled');

  const record = await adminUsersRepository.findForLogin(email);
  if (!record) {
    timingDecoy ??= hashSecret('autolink-timing-decoy');
    await verifySecret(await timingDecoy, password);
    fail(locale, 'invalid');
  }
  if (!(await verifySecret(record.passwordHash, password))) fail(locale, 'invalid');

  const token = await sealAdminSession({ sub: record.id, role: record.role }, process.env.AUTH_SECRET);
  (await cookies()).set(ADMIN_COOKIE_NAME, token, adminCookieOptions);
  await adminUsersRepository.touchLastLogin(record.id);
  redirect(`/${locale}/admin/tags`);
}
