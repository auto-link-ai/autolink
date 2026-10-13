import { randomBytes } from 'node:crypto';
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { clearPinAttempts, spendPinAttempt } from '@/lib/auth/pinLimits';
import { usersRepository } from '@/lib/db/repositories/users';
import { hashPin, verifyPin } from '@/lib/security/pin';
import { pinLoginSchema } from '@/lib/validation/auth';

/**
 * As long as browsers keep a cookie: Chrome and Android refuse more than 400 days.
 * Renewed on every visit (components/site/KeepSignedIn.tsx), so an owner is only
 * signed out by « Se déconnecter », by a new PIN, or by not opening AutoLink
 * for over a year.
 */
const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * A real hash of a random value, computed once. An unknown number is verified
 * against it, so signing in with a number that has no account takes the same
 * time as signing in with one that does.
 */
let decoyHash: Promise<string> | null = null;
const decoy = () => (decoyHash ??= hashPin(randomBytes(16).toString('hex')));

/** Too many tries for this number: said apart from a wrong PIN, so the owner knows to wait or reset. */
class PinThrottled extends CredentialsSignin {
  code = 'throttled';
}

/**
 * Owner sessions (Auth.js v5, credentials + JWT): WhatsApp number and PIN.
 *
 * Tries are counted here, per number, before anything is checked — not only in
 * the sign-in action — so no way into `authorize` skips the limit. (The HTTP
 * route serves GET only; server actions call `signIn` directly.)
 *
 * The token carries the user id and the account's session version, nothing
 * else: the account is re-read on every request (lib/auth/session.ts), so a
 * blocked account, a deleted one, or one whose PIN changed cannot keep
 * browsing on an old token.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/ar/login' },
  trustHost: true,
  logger: {
    // A wrong PIN is an expected event, not an incident: one line, no stack
    // trace. (`type`, not `name`: a subclass such as PinThrottled renames itself.)
    error(error) {
      if ((error as { type?: string }).type === 'CredentialsSignin') {
        console.warn('[auth] sign-in refused');
        return;
      }
      console.error('[auth]', error);
    },
  },
  providers: [
    Credentials({
      credentials: { phone: {}, pin: {} },
      async authorize(raw) {
        const parsed = pinLoginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { phone, pin } = parsed.data;

        if (!(await spendPinAttempt(phone))) throw new PinThrottled();
        const candidate = await usersRepository.findForPinLogin(phone);
        const valid = await verifyPin(candidate?.pinHash ?? (await decoy()), pin);
        if (!candidate || !valid || candidate.status !== 'ACTIVE') return null;

        await Promise.all([usersRepository.touchLastLogin(candidate.id), clearPinAttempts(phone)]);
        return { id: candidate.id, sv: candidate.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Only at sign-in does `user` exist; afterwards the token keeps what was set.
      if (user?.id) {
        token.sub = user.id;
        token.sv = user.sv;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      // An old token without a version never matches an account: it is signed out.
      session.user.sv = typeof token.sv === 'number' ? token.sv : -1;
      return session;
    },
  },
});
