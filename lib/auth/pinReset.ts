import 'server-only';
import { after } from 'next/server';
import { phoneCodesRepository } from '@/lib/db/repositories/phoneCodes';
import { usersRepository } from '@/lib/db/repositories/users';
import { maskPhone } from '@/lib/format/phone';
import { newPinProblem } from '@/lib/validation/pin';
import { checkCode, issueCode, resendCode } from './codes';
import { replacePin } from './pinChange';

/**
 * « Code PIN oublié ? »: a WhatsApp code to the number, then a new PIN.
 *
 * The answer never says whether the number has an account. A number without
 * one (or a blocked account) gets a decoy challenge that is never sent and
 * never verifies; every send limit is counted the same way; and the real code
 * is sent after the response, so both answers take as long.
 */
export type ResetErrors = Partial<Record<string, string>>;

export type ResetState =
  | { step: 'phone'; fieldErrors?: ResetErrors; formError?: string }
  | { step: 'code'; challengeId: string; phoneHint: string; fieldErrors?: ResetErrors; formError?: string; notice?: 'resent' };

export async function requestPinReset(phone: string, ipHash: string): Promise<ResetState> {
  const account = await usersRepository.findByPhone(phone);
  const issued = await issueCode({ phone, purpose: 'RESET_PIN', ipHash, decoy: account?.status !== 'ACTIVE' });
  if (!issued.ok) return { step: 'phone', formError: issued.reason === 'unavailable' ? 'code_unavailable' : 'rate_limited' };
  after(async () => {
    await issued.deliver();
  });
  return { step: 'code', challengeId: issued.challengeId, phoneHint: maskPhone(phone) };
}

export async function resendPinReset(challengeId: string, ipHash: string): Promise<ResetState> {
  const live = await phoneCodesRepository.findLive(challengeId, 'RESET_PIN');
  const base = { step: 'code' as const, challengeId, phoneHint: maskPhone(live?.phone ?? '') };
  const resent = await resendCode(challengeId, 'RESET_PIN', ipHash);
  if (!resent.ok) {
    const formError = { expired: 'code_expired', too_soon: 'code_too_soon', rate_limited: 'rate_limited', unavailable: 'code_unavailable' }[resent.reason];
    return { ...base, formError };
  }
  after(async () => {
    await resent.deliver();
  });
  return { ...base, notice: 'resent' };
}

export type FinishResetResult = { ok: true; phone: string } | { ok: false; state: ResetState };

/** The code proves the phone; the new PIN replaces the old one everywhere. */
export async function finishPinReset(input: {
  challengeId: string;
  code: string;
  pin: string;
  pinConfirm: string;
}): Promise<FinishResetResult> {
  const live = await phoneCodesRepository.findLive(input.challengeId, 'RESET_PIN');
  const fail = (extra: Omit<Extract<ResetState, { step: 'code' }>, 'step' | 'challengeId' | 'phoneHint'>): FinishResetResult => ({
    ok: false,
    state: { step: 'code', challengeId: input.challengeId, phoneHint: maskPhone(live?.phone ?? ''), ...extra },
  });
  if (!live) return fail({ formError: 'code_expired' });

  // Checked before the code, so a PIN typo never spends it.
  const problem = newPinProblem(input.pin, input.pinConfirm, live.phone);
  if (problem) return fail({ fieldErrors: problem === 'pin_mismatch' ? { pinConfirm: problem } : { pin: problem } });

  const checked = await checkCode(input.challengeId, 'RESET_PIN', input.code);
  if (!checked.ok) {
    return checked.reason === 'invalid' ? fail({ fieldErrors: { code: 'code_invalid' } }) : fail({ formError: 'code_expired' });
  }
  const account = await usersRepository.findByPhone(checked.challenge.phone);
  if (!account || account.status !== 'ACTIVE' || !(await replacePin(account.id, checked.challenge.phone, input.pin))) {
    return fail({ formError: 'code_expired' });
  }
  return { ok: true, phone: checked.challenge.phone };
}
