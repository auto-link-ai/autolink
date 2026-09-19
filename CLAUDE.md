# AutoLink — Working Agreement

## What this project is
AutoLink is ONE physical consumer product: a QR sticker on a car that lets a stranger
message the owner without ever seeing the owner's phone number.

Buy → activate → stick → forget → get contacted.

## What this project is NOT
Not fleet management. Not a dashboard SaaS. Not NFC. Not a marketplace. Not a delivery
platform. Not social. Not subscriptions. Not a mobile app. Not analytics.

Before adding anything, answer: "Does this make the physical car tag better?"
If no — do not build it.

## Hard rules
1. **Never** expose the owner's phone, email, name, address, or plate to a scanner.
2. **Never** put personal data in a QR code. The QR encodes the public tag URL and nothing else.
3. **Never** import `lib/db/models/*` directly inside a route handler or server component.
   All data access goes through `lib/db/repositories/*`, which take the session/actor as an
   argument and scope every query by owner. There is no RLS in MongoDB — the repository
   layer IS the security boundary.
4. **Never** expose Mongo `_id` to the client. Public identifiers only (`publicTagId`, etc.).
5. **Never** hardcode the price, rate limits, retention days, or delivery fees. They live in
   the `settings` collection, read through `lib/config/settings.ts`.
6. **Never** trust client-side authorization. Re-check on the server every time.
7. **Never** commit secrets. `.env.example` only.
8. **Never** show raw database or stack errors to a user.
9. **Never** reveal whether an unknown tag exists. Invalid, deleted, and never-existed tags
   all render the identical "This AutoLink is not available" state.

## Process rules
- Inspect the existing tree before writing. Do not delete or rewrite files outside the
  current phase's scope.
- Use plan mode for any phase touching more than 5 files. Show the plan, wait for approval.
- Commit at the end of every phase with a conventional message (`feat(scanner): ...`).
- Run `pnpm typecheck && pnpm lint && pnpm test` before declaring a phase done.
- If a requirement is ambiguous, ask — do not invent a feature to resolve it.
- Small files. If a file passes ~250 lines, split it.

## Stack (fixed — do not substitute)
Next.js 15 App Router · TypeScript strict · Tailwind CSS · MongoDB Atlas + Mongoose ·
Auth.js v5 (credentials) · web-push (VAPID) · Resend (behind an abstraction) ·
next-intl · Cloudflare Turnstile · Vercel + Vercel Cron · pnpm

Do not install: Redis, Prisma, state management libraries, animation libraries,
chart libraries, UI kits beyond Tailwind + a local `components/ui` set.

## Performance budget
`/t/[tagId]` is the most important page in the product. It must be a server component,
ship < 30KB of JS, and have no blocking third-party requests. Turnstile loads lazily and
only when a rate-limit threshold has been crossed.

## Repo notes (how the rules are enforced)
- Rule 3 is enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`): only
  `lib/db/**` may import `mongoose` or `lib/db/models/*`. Scripts go through repositories too.
- Everything under `lib/db`, `lib/config`, and `lib/security` starts with `import 'server-only'`,
  so it can never be bundled into client code. Scripts run under
  `tsx --conditions=react-server` for that reason; Vitest aliases `server-only` to a stub.
- Mongoose runs with `strictQuery: 'throw'`: a typo'd filter field throws instead of
  silently matching every document.
- Design tokens live in `app/globals.css` (brand palette + structural scale). Build UI from
  those tokens; do not add a second visual language.
