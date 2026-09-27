'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getSettings } from '@/lib/config/settings';
import { blockedMessagesRepository } from '@/lib/db/repositories/blockedMessages';
import { messagesRepository } from '@/lib/db/repositories/messages';
import { checkMessage } from '@/lib/moderation/check';
import { needsCheck } from '@/lib/moderation/verdict';
import { rateLimitsRepository } from '@/lib/db/repositories/rateLimits';
import { notifyOwnerOfMessage } from '@/lib/notifications/notify';
import { ensureScannerSessionId } from '@/lib/scanner/session';
import { resolveScannerLocale, SCANNER_LANG_COOKIE } from '@/lib/scanner/request';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { isLocale } from '@/i18n/locales';
import { fieldErrors } from '@/lib/validation/auth';
import { messageSchema, type MessageField } from '@/lib/validation/message';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import type { ReportFormState } from './state';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Sends a message to the owner of a scanned sticker.
 *
 * Order matters: rate limits first, then the challenge, then the content, then
 * the words, then the tag. Every refusal that could reveal whether a sticker
 * exists answers with the same generic state (rule 9); the words are judged
 * before the sticker is looked up, so an abusive message learns nothing either.
 */
export async function sendReportAction(_prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const publicTagId = normalizeTagIdInput(String(formData.get('tagId') ?? ''));
  if (!publicTagId) return { status: 'error', formError: 'unavailable' };

  const settings = await getSettings();
  const ipHash = hashIp(getClientIp(await headers()));

  // Two windows: one protects a single car from being spammed, the other
  // protects every car from one sender.
  const [byTag, byIp] = await Promise.all([
    rateLimitsRepository.hit(`scan:tag:${publicTagId}`, settings.rateLimitPerTagPerHour, HOUR_MS),
    rateLimitsRepository.hit(`scan:ip:${ipHash}`, settings.rateLimitPerIpPerHour, HOUR_MS),
  ]);
  if (!byTag.allowed || !byIp.allowed) return { status: 'error', formError: 'rate_limited' };

  // Past the threshold this sender has to prove they are a person.
  const challenge = byIp.count > settings.captchaThreshold;
  if (challenge) {
    const token = formData.get('cf-turnstile-response');
    const passed = await verifyTurnstile(typeof token === 'string' ? token : null, ipHash);
    if (!passed) return { status: 'error', formError: 'challenge_failed', challenge: true };
  }

  const parsed = messageSchema(settings.maxMessageLength).safeParse({
    category: formData.get('category') ?? '',
    body: formData.get('body') ?? '',
    scannerContact: formData.get('scannerContact') ?? '',
  });
  if (!parsed.success) {
    return { status: 'error', fieldErrors: fieldErrors<MessageField>(parsed.error), challenge };
  }

  const locale = await resolveScannerLocale();
  const scanner = { kind: 'scanner' as const, scannerSessionId: await ensureScannerSessionId(), ipHash };

  // Insults and threats, in Darija too, never reach the owner. The sender is
  // asked to rephrase, so a genuine alert typed in anger still gets through.
  if (needsCheck(parsed.data.body)) {
    const verdict = await checkMessage(parsed.data.body);
    if (verdict.kind === 'abusive') {
      await blockedMessagesRepository
        .record(scanner, {
          publicTagId,
          category: parsed.data.category,
          body: parsed.data.body,
          scannerContact: parsed.data.scannerContact,
          reason: verdict.reason,
          locale,
          retentionDays: settings.messageRetentionDays,
        })
        .catch((error: unknown) => console.error('[scan] could not record a blocked message:', error instanceof Error ? error.message : error));
      return { status: 'error', formError: 'abusive', challenge };
    }
  }

  let result;
  try {
    result = await messagesRepository.create(
      scanner,
      {
        publicTagId,
        category: parsed.data.category,
        body: parsed.data.body,
        scannerContact: parsed.data.scannerContact,
        locale,
        retentionDays: settings.messageRetentionDays,
      },
    );
  } catch (error) {
    console.error('[scan] message failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error', challenge };
  }

  if (!result.ok) return { status: 'error', formError: 'unavailable' };

  // The sender should not wait on a push round trip.
  const publicId = result.publicId;
  after(() => notifyOwnerOfMessage(publicId));

  redirect(`/t/${publicTagId}?sent=1`);
}

/** The language switcher: sets the preference and reloads the same sticker. */
export async function setScannerLanguageAction(formData: FormData): Promise<void> {
  const lang = formData.get('lang');
  const publicTagId = normalizeTagIdInput(String(formData.get('tagId') ?? ''));
  if (isLocale(lang)) {
    (await cookies()).set(SCANNER_LANG_COOKIE, lang, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  redirect(publicTagId ? `/t/${publicTagId}` : '/');
}
