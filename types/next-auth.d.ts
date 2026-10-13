import 'next-auth';

/**
 * The session carries the owner's user id and the account's session version
 * (bumped by a new PIN, which signs every other device out) — nothing else.
 * The JWT itself is already an open record, so only these two are augmented.
 */
declare module 'next-auth' {
  interface User {
    sv?: number;
  }

  interface Session {
    user: {
      id: string;
      sv: number;
    } & DefaultSession['user'];
  }
}
