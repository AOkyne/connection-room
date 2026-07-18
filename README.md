# The Connection Room

A private, members-only community platform built for Trevor James's community of
men practicing honest connection, embodied intimacy, and self-understanding.

Not therapy. Not Grindr. Something else — a space for structured, consensual,
non-performative connection between men, built around daily reflection, curated
community spaces, guided one-on-one "Connections," and a member profile model
that lets people be known without forcing anyone to overshare.

This document is the developer entry point. Product framing and tone live in
[`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md); system design lives in
[`ARCHITECTURE.md`](ARCHITECTURE.md); the data model lives in
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md); privacy rules live in
[`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).

## Project status

This is a live, in-production application, not a demo shell. Supabase
(PostgreSQL + Auth + Storage) is the real, active backend — every core
feature (profiles, spaces, posts, Connections, events, Daily Companion,
admin tools) reads and writes real data. There is no separate "Phase 2"
still pending; that framing exists only in now-stale historical docs.

The product is still early and evolving quickly ("the paint is still wet") —
founding members are actively shaping direction, language, and features.

## Core features

- **Daily Companion** — a rotating daily theme, reflection prompt, embodiment
  practice, body check-in, conversation invitation, and quote, plus a
  weekly note from Trevor. Curated content lives in Supabase
  (`daily_companion_content`, `weekly_notes`) with a static seed-data
  fallback. See `lib/data/daily-companion.ts` and
  [`ARCHITECTURE.md`](ARCHITECTURE.md#daily-companion).
- **Three-tier home dashboard** — Today (Daily Companion), Continue (recent
  activity, upcoming events), and Explore (journey progress, spaces,
  community, articles, badges). The dashboard is meant to feel like a
  companion, not a control panel.
- **Spaces and community posts** — topical discussion spaces
  (`spaces`/`space_memberships`) with posts, comments, and reactions.
- **Member profiles with member-controlled visibility** — a private
  `profiles` table and a separate, curated `public_profiles` table/view that
  only ever exposes what a member has chosen to share. See
  [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).
- **Structured Connections** — opt-in, 20-minute guided one-on-one
  conversations between members: requests, acceptance, a real-time chat, and
  server-side matching (`app/api/matching/find`) that never exposes private
  scoring fields to the browser. (Historical migrations and a legacy,
  unused data file refer to this as "Pairings" — the current system and
  all current code use "Connections.")
- **Events and offers** — a calendar of workshops/circles/retreats with
  registration and interest tracking, plus an admin-managed "offers"
  catalog (coaching, retreats, etc.).
- **Badges and milestones** — computed client-side from a member's actual
  activity (no `badges`/`user_badges` table exists in the live schema).
- **Onboarding and the Seven Doors journey** — a guided first-week
  experience, plus a longer "Guided Rhythm" monthly/weekly cadence.
- **Reflections** — private and shareable responses to daily/weekly prompts.
- **Admin dashboard** — member management, events/offers CRUD, broadcast
  email, moderation, activity, and content authoring for the Daily
  Companion, gated by a real `role = 'admin'` check enforced both at the
  database (RLS) and in admin-only API routes.
- **Articles ("Trevor Notes")** — synced from Substack into a Supabase
  `articles` table and surfaced in-app.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 (no separate component library — custom
  components in `components/`)
- **Backend/data**: Supabase (PostgreSQL, Auth, Storage), accessed via
  `@supabase/supabase-js`
- **Hosting**: Vercel (auto-deploy on push to `main`; two scheduled Vercel
  Cron routes, see `vercel.json`)
- **Email**: Nodemailer over SMTP (`lib/email/`) for transactional and
  broadcast email
- **Third-party integrations**: Zoom (meeting creation for events, admin
  only), ScoreApp (embedded quiz widgets), a separate Substack-sync and a
  separate "workshop ops" app (`workshops.trevorjamesla.com`) that this app
  pushes event registrations to via webhook
- **Testing**: no automated test suite or test runner is configured in this
  repository as of this writing (`package.json` has no `test` script and no
  testing dependency). Verification is currently manual/live-testing based.

## Local development

Verified against the current `package.json`.

```bash
npm install
npm run dev      # Next.js dev server, http://localhost:3000
npm run build    # Production build
npm run start    # Run the production build locally
npm run lint     # ESLint (eslint.config via eslint-config-next)
```

There is no `npm run typecheck` script; use `npx tsc --noEmit` directly when
you need a standalone type check.

## Environment variables

Sourced from an actual `grep -R "process.env"` sweep of `app/`, `components/`,
and `lib/` — not from `.env.example`, which lists several variables the code
does not currently read (see "Known documentation/implementation gaps"
below).

**Required for the app to run as anything other than an unauthenticated demo
shell:**

| Variable | Client/server | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client) | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (server only)** | Used by admin API routes, `app/api/matching/find`, `app/api/invites/friends`, and cron/webhook routes to run privileged queries server-side. Never expose to the client. |

**Required for specific features (routes fail/skip gracefully without them):**

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Verifies Vercel Cron requests to `/api/cron/*` |
| `POST_NOTIFICATION_WEBHOOK_SECRET` | Verifies the Postgres trigger call to `/api/webhooks/new-post-notification` (migration 054) |
| `WORKSHOP_API_KEY` | Server-only. Authenticates outbound calls to the external workshop-ops app |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Outbound transactional/broadcast email via Nodemailer |
| `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | Server-only. Zoom Server-to-Server OAuth app, used by admin event tooling to create/delete meetings |

**Optional, with hardcoded fallbacks in code:**

| Variable | Fallback |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://community.trevorjamesla.com` (or `http://localhost:3000` in a couple of call sites) — used to build links in emails/webhooks |

**Local-only:**

`.env.local` (gitignored) is where all of the above are set for local
development; there is no separate local-only variable.

**Do not set real secrets in `.env.example`** — it should only ever contain
variable names and, at most, non-secret defaults.

## Database setup

- Migrations live in `supabase/migrations/`, numbered `001` through `054` as
  of this writing. Apply them **in numeric order** — several later
  migrations exist specifically to fix bugs or gaps introduced by earlier
  ones (see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#migration-history-notes)
  for the important ones), so skipping ahead or applying out of order can
  reintroduce fixed bugs.
- **Two migration numbers are duplicated**: there are two files each named
  `005_*` and `029_*`, and numbers `022`, `023`, and `030` do not exist at
  all. This is a real gap in the migration history, not a documentation
  error — see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#known-schema-risks).
- Apply migrations via the Supabase SQL editor or the Supabase CLI
  (`supabase db push` / running each file against your project). There is
  no automated migration-runner script in this repository.
- A separate, older file, `lib/supabase/schema.sql`, predates the
  migrations workflow and is **not** used by anything in this repo — it
  describes a different, legacy shape (e.g. `pairings`, `space_members`)
  that no longer matches the live schema. Do not run it.
- Seed data (`002_seed_example_content.sql`, `013`–`015`, `025`, `029_seed_theme_tags.sql`)
  is optional and intended for demo/staging content, not required for the
  app to function against a fresh database — but several features (Daily
  Companion content, weekly notes) fall back to static content in
  `lib/seed/` and `lib/content/` if their tables are empty, so seeding is
  recommended for a realistic local environment.
- To verify migrations applied correctly, the most reliable method used
  throughout this project's history has been a direct `pg_policies` /
  `information_schema` check against the live database (via the Supabase
  SQL editor or service-role client) — **the migration files in this repo
  are not a fully reliable record of live database state.** At least one
  past incident (migration 040) found policies live in production with no
  corresponding migration file, and the `articles` table itself has no
  `CREATE TABLE` migration in this repo at all despite being actively used
  in production — it was created out-of-band. Treat `supabase/migrations/`
  as the primary source of truth, but confirm anything security-relevant
  directly against the live database before relying on it.

## Deployment

- **Hosting**: Vercel. Every push to `main` triggers a production
  deployment automatically.
- **Cron jobs**: `vercel.json` schedules two routes — `/api/cron/drip-emails`
  (daily) and `/api/cron/sync-substack` (daily). A third cron-shaped route,
  `/api/cron/space-digest-emails`, exists in code but is **not** registered
  in `vercel.json`; per its own migration's comment (054), it's intended to
  be triggered by an external scheduler (e.g. cron-job.org) instead, since
  Vercel's Hobby plan only allows a limited number of cron jobs. Confirm
  this is actually wired up externally before relying on digest emails
  firing.
- **Database**: Supabase-hosted PostgreSQL. Production migrations must be
  applied manually (see above) — there is no CI step that runs migrations
  on deploy.
- **Environment variables**: set in the Vercel project's environment
  variable settings for the `production` (and `preview`, if used)
  environment. Changing an environment variable requires a new deployment
  to take effect.
- **Demo/preview behavior**: there is no dedicated `/preview` route in this
  codebase (`app/preview/` does not exist), and "demo mode" is not a
  runtime session toggle — it's simply what the app falls back to when
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent
  (`lib/app-mode.ts`). In the deployed production environment, Supabase is
  configured, so the app always runs in real ("beta") mode; there is
  currently no live, reachable way for an anonymous visitor to enter a
  sandboxed demo session against production data. See
  [`ARCHITECTURE.md`](ARCHITECTURE.md#demo-and-preview-architecture) and
  [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md#demo-isolation)
  for the full picture, including why this is flagged as a known
  limitation rather than a fully-designed isolation system.

## Known documentation/implementation gaps

Found during this documentation pass and left unresolved (fixing them is a
code change, not a docs change):

- `.env.example` documents several variables
  (`NEXT_PUBLIC_DAILY_COMPANION_LAUNCH_DATE`, `NEXT_PUBLIC_PLATFORM_TIMEZONE`,
  `NEXT_PUBLIC_DEMO_MODE_ENABLED`, `NEXT_PUBLIC_QUIZ_URL`,
  `NEXT_PUBLIC_CONSULT_URL`, `NEXT_PUBLIC_COUPLES_CALL_URL`,
  `NEXT_PUBLIC_MAIN_WEBSITE`) that are **not read anywhere in the current
  codebase** — the Daily Companion launch date and marketing URLs are
  hardcoded directly in `lib/data/daily-companion.ts` and `lib/config.ts`
  instead. The environment variables listed in this README are the ones
  actually consumed by the code as of this audit.
- `offers`, `event_registrations`, and `admin_activity_logs` still carry the
  broken `profiles.id = auth.uid()` admin-check pattern in their RLS
  policies (never matches, since `profiles.id` is a generated row UUID, not
  the auth user id) — confirmed unfixed as recently as migration 046, which
  fixed the same pattern on `events`. See
  [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#known-schema-risks).

## Documentation map

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design, route structure,
  dashboard architecture, auth, admin, demo/preview behavior, data access
  patterns.
- [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — tables, relationships, RLS
  summary, migration history, known schema risks.
- [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md) — what's public,
  what's private, visibility states, RLS model, known limitations.
- [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md) — the product's guiding
  principles, written for anyone on the team, not just engineers.
- [`ROADMAP.md`](ROADMAP.md) — what's next, grouped by confidence level.
- [`CHANGELOG.md`](CHANGELOG.md) — major milestones to date.
