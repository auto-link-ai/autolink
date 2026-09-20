import 'next-auth';

/** The session carries the customer's user id and nothing else. */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
