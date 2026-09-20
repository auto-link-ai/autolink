# AutoLink

A QR sticker for a car. A stranger scans it and messages the owner; the owner's
phone number is never shown. **Scan. Contact. Done.**

Working rules for this codebase live in [CLAUDE.md](CLAUDE.md). Read them first.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · MongoDB Atlas + Mongoose ·
Auth.js v5 · web-push · Resend · next-intl (fr / ar / en) · Cloudflare Turnstile · Vercel · pnpm

## Setup

Requirements: **Node.js 22.9+** and **pnpm 10** (`npm i -g pnpm@10`).

```bash
pnpm install
cp .env.example .env            # then fill it in (see below) — .env and .env.local are gitignored
pnpm seed                       # indexes, 58 wilayas, settings, first admin
pnpm dev                        # http://localhost:3000 → redirects to /fr, /ar or /en
```

Admin: `http://localhost:3000/fr/admin` (sign in with the seeded admin).

### Environment

Never put real values in `.env.example` — it is committed, and a unit test fails if a
secret-bearing key there is non-empty.

| Variable | How to get it |
|---|---|
| `MONGODB_URI` | Atlas → Connect → Drivers → Node.js. URL-encode special characters in the password. The machine's IP must be on Atlas → Network Access. |
| `AUTH_SECRET` | `openssl rand -base64 32` (also keys the admin session cookie) |
| `IP_HASH_SALT`, `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | The origin printed into every QR code. Production: `https://<your domain>`. To test with a phone locally: `http://<your Wi-Fi IP>:3000`. |
| `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `EMAIL_API_KEY` | resend.com (needs a verified sending domain) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Seed only. Leave the password empty to have one generated and printed once. |

### Seeding

`pnpm seed` is idempotent. It syncs indexes (production connects with `autoIndex` off,
so this is how TTL indexes get built), upserts the 58 wilayas, creates the settings
document with its defaults, and creates one admin if that email doesn't exist yet.

The delivery fees it writes are **placeholders** (800 DA home / 500 DA stop-desk for every
wilaya). Replace them with real courier prices before taking orders.

## Tags & printing

`/admin/tags` generates a batch (1–100 tags) and downloads a ZIP: QR codes (SVG + PNG),
one sticker PDF per tag (100 × 100 mm, 3 mm bleed, crop marks), an A4 gang sheet,
the activation slips, `claim/AUT-*.png`, and `tags.csv`. **Activation codes exist only in
that ZIP** — the database stores argon2id hashes. If a ZIP is lost, "Reissue codes" issues
new codes for the batch's tags that are not activated yet.

Two QRs per sticker, and they are not interchangeable:

| | Where it goes | Opens |
|---|---|---|
| `qr/AUT-*.svg` \| `.png` | printed on the sticker, on the car | `/t/AUT-…` — anyone can scan it |
| `claim/AUT-*.png` | sent to that one customer (also on their slip) | `/fr/activate?t=…&c=…` — claims the sticker |

Send a customer only their own `claim/` image. It carries the activation code, so it can
**never be regenerated** from the database — reissue the batch's codes instead.

The logo lives in [public/brand/](public/brand/): `autolink-logo.svg` (the lockup) and
`autolink-mark.svg` (the mark alone, also the favicon at `app/icon.svg`). The site uses it
through `components/Wordmark.tsx`, and the print code draws the same file into the PDFs, so
screen and paper cannot drift apart.

Sticker artwork, the designer brief and alignment checks: see [print/README.md](print/README.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (includes the repository-boundary import rule) |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright (starts its own dev server on port 3100) |
| `pnpm seed` | Seed / sync the database |
| `pnpm admin:password <email>` | Give an existing admin a new generated password (shown once) |
| `pnpm print:preview` | Render sample print files into `print/preview/` (no database) |
| `pnpm check:codes <tags.csv>` | Prove a batch's activation codes are stored nowhere in plaintext |

Playwright needs a browser: `pnpm exec playwright install chromium`, or use an installed
Chrome with `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`. The admin flow tests run only when
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are set — point `MONGODB_DB_NAME` at a
throwaway database for them.

Before declaring a phase done: `pnpm typecheck && pnpm lint && pnpm test`.

## Layout

```
app/[locale]/          localized routes (html lang/dir set here)
app/[locale]/admin/    admin: login + (protected) pages
app/api/admin/         batch generation / reissue (ZIP downloads)
app/t/                 scanner page, prefix-free (Phase 2)
components/ui/         Button, Field, Badge, Card
i18n/                  locales, routing, request config
messages/              fr.json (default), ar.json, en.json — kept key-identical by a test
lib/db/models/         Mongoose models — importable ONLY by repositories
lib/db/repositories/   the security boundary: all data access, actor-scoped
lib/admin/             admin session (encrypted cookie), auth guard, list query parsing
lib/tags/              id/code generation, status transitions, QR URL guard, batch service
lib/print/             QR, sticker/sheet/slip PDFs, template loading, ZIP
lib/config/settings.ts price, fees, limits, retention (60s cache)
lib/validation/        zod schemas + DZ phone, tag-id, activation-code validators
lib/security/          argon2id, IP hashing, same-origin check
print/sticker/         template.json (+ designer artwork PDF)
scripts/               seed, print preview, code-leak check
tests/unit, tests/e2e  Vitest, Playwright
```
