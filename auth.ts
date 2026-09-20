import { randomBytes } from 'node:crypto';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { usersRepository } from '@/lib/db/repositories/users';
import { hashSecret, verifySecret } from '@/lib/security/password';
import { loginSchema } from '@/lib/validation/auth';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/**
 * A real hash of a random string, computed once. An unknown email is verified
 * against it so signing in with an address that does not exist takes the same
 * time as signing in with one that does.
 */
let decoyHash: Promise<string> | null = null;
const decoy = () => (decoyHash ??= hashSecret(randomBytes(24).toString('base64url')));

/**
 * Customer sessions (Auth.js v5, credentials + JWT).
 *
 * The token carries the user id and nothing else: the account is re-read from
 * the database on every request (lib/auth/session.ts), so a blocked or deleted
 * account cannot keep browsing on an old token. Rate limiting happens in the
 * sign-in action before `signIn` is called — the provider itself only verifies.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: THIRTY_DAYS_SECONDS },
  pages: { signIn: '/fr/login' },
  trustHost: true,
  logger: {
    // A wrong password is an expected event, not an incident: one line, no
    // stack trace. Everything else is logged as it comes.
    error(error) {
      if (error.name === 'CredentialsSignin') {
        console.warn('[auth] sign-in refused');
        return;
      }
      console.error('[auth]', error);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const candidate = await usersRepository.findForLogin(parsed.data.email);
        const valid = await verifySecret(candidate?.passwordHash ?? (await decoy()), parsed.data.password);
        if (!candidate || !valid || candidate.status !== 'ACTIVE') return null;

        await usersRepository.touchLastLogin(candidate.id);
        return { id: candidate.id };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
