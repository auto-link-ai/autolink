# AutoTag

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
cp .env.example .env.local      # then fill it in (see below)
pnpm seed                       # indexes, 58 wilayas, settings, first admin
pnpm dev                        # http://localhost:3000 → redirects to /fr, /ar or /en
```

### Environment

At minimum for local development: `MONGODB_URI` (and optionally `MONGODB_DB_NAME`).
The other variables are needed from the phase that introduces them.

| Variable | How to get it |
|---|---|
| `MONGODB_URI` | Atlas → Connect → Drivers → Node.js. URL-encode special characters in the password. |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `IP_HASH_SALT`, `CRON_SECRET` | `openssl rand -hex 32` |
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

Playwright needs a browser: `pnpm exec playwright install chromium`, or use an installed
Chrome with `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`.

Before declaring a phase done: `pnpm typecheck && pnpm lint && pnpm test`.

## Layout

```
app/[locale]/          localized routes (html lang/dir set here)
app/t/                 scanner page, prefix-free (Phase 2)
components/            shared UI
i18n/                  locales, routing, request config
messages/              fr.json (default), ar.json, en.json — kept key-identical by a test
lib/db/connect.ts      cached serverless connection
lib/db/models/         Mongoose models — importable ONLY by repositories
lib/db/repositories/   the security boundary: all data access, owner-scoped
lib/config/settings.ts price, fees, limits, retention (60s cache)
lib/validation/        zod schemas + DZ phone and tag-id validators
lib/format/            DZD formatting (1 500 DA)
lib/security/          argon2id helpers
scripts/seed.ts        pnpm seed
tests/unit, tests/e2e  Vitest, Playwright
```
