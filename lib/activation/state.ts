/**
 * Where the activation screen is, as the server action reports it. Plain data,
 * shared by the server actions and the client wizard (a "use server" file may
 * only export async functions). It never carries the PIN or the code: the
 * browser keeps what the owner typed, the server keeps only the challenge.
 * Success is not a state: the action signs the owner in and redirects to
 * /activate/done, a page of its own that a refresh cannot lose.
 */
export type ActivationErrors = Partial<Record<string, string>>;

export type ActivationState =
  | { step: 'details'; fieldErrors?: ActivationErrors; formError?: string }
  | {
      step: 'code';
      /** The opaque challenge (lib/auth/codes.ts) the code belongs to. */
      challengeId: string;
      /** « 05 •• •• 34 56 »: which number the code went to. */
      phoneHint: string;
      fieldErrors?: ActivationErrors;
      formError?: string;
      notice?: 'resent';
    };

export const ACTIVATION_INITIAL: ActivationState = { step: 'details' };

/** The page that celebrates a sticker just activated — `pin`: an existing account's PIN was replaced. */
export function activationDonePath(locale: string, publicTagId: string, pinUpdated = false): string {
  return `/${locale}/activate/done?t=${encodeURIComponent(publicTagId)}${pinUpdated ? '&pin=1' : ''}`;
}
