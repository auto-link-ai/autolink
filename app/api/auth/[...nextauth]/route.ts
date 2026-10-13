import { handlers } from '@/auth';

/**
 * GET only: the session check that keeps an owner signed in
 * (components/site/KeepSignedIn.tsx). Signing in happens in server actions,
 * which call `signIn` directly — no POST here, so no way to try PINs without
 * going through the limits.
 */
export const { GET } = handlers;
