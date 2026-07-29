# Async Guided Connections

Replaces the live-first "two members online at once for 20 minutes" model
with an asynchronous-first **Guided Connection Exchange**: invitation →
mutual acceptance → structured async rounds → optional live conversation →
complete. The legacy live 20-minute chat (migration 010) is preserved as an
optional add-on, not removed -- see [Relationship to the legacy live
chat](#relationship-to-the-legacy-live-chat) below.

Schema: `supabase/migrations/078_async_guided_connections_schema.sql`
(tables, RLS, RPCs), `079_async_connections_feature_flag_and_settings.sql`
(feature flag + configurable durations), `080_async_connections_legacy_backfill.sql`
(backfills existing rows). Read migration 078's own header comment first --
it documents every design decision (why `connections` is extended rather
than replaced, why mutual acceptance is modeled the way it is, why draft
text can never leak to the other participant, why blocking is now
server-enforced) in more depth than this file repeats.

## Feature flag

`feature_async_connections_enabled` in `platform_settings` (same
public-read/admin-write pattern as `feature_connections_enabled`, migration
026). While false, `connection_async_beta_user_ids` (a JSON array of
`user_id`s) can still turn the feature on for a specific beta cohort --
`lib/data/featureFlags.ts#isAsyncConnectionsEnabled(userId)` checks both.
Flip the top-level flag to `true` to roll out to everyone; flip it back to
`false` to disable for everyone without deleting any data.

Configurable timing also lives in `platform_settings`:
`connection_invitation_expiry_hours` (72), `connection_round_response_hours`
(48), `connection_extension_hours` (48). Read server-side via
`get_connection_setting_hours()` (migration 078), with hardcoded fallbacks
if a row is ever missing.

## Lifecycle

```
proposed (create_connection_invitation)
  -> awaiting_acceptance
    -> accept_connection_invitation (2nd acceptance only) -> active, round 1 opens
    -> decline_connection_invitation -> declined
    -> (72h no response) -> expired
  -> active / extended / awaiting_next_round (repeats per round)
    -> submit_round_response (both sides) -> round revealed
    -> advance_round (both sides) -> next round opens, or...
  -> exchange_complete (final round done)
    -> request_live_conversation -> live_requested -> live_scheduled -> completed
    -> end_connection -> ended (any time, either side)
    -> report_connection -> reported
```

Participant-level state (`connection_participants.invitation_status` plus
per-round `connection_responses` timestamps): `invited -> accepted|declined`,
then per round `(draft) -> submitted -> revealed -> viewed -> advanced`.

**Mutual acceptance**: the inviter's participant row is marked accepted at
invitation-creation time (sending an invitation is itself an acceptance);
the invitee's explicit accept is the second, activating acceptance. This is
what makes "first acceptance doesn't activate, second does" true without a
separate proposal object.

## Reveal logic

`submit_round_response()` (migration 078) takes a row lock on the round
before checking whether both sides have now submitted, so under two
near-simultaneous submissions exactly one transaction observes "both done"
and flips `connection_rounds.status` to `revealed`. Submitted text is
immutable (re-submission is rejected, not silently overwritten).

Draft text is never visible to the other participant, even after reveal:
`connection_responses` SELECT is owner-only RLS; the other side's revealed
response is read through `get_round_responses()`, a SECURITY DEFINER
function that strips `draft_text` entirely and re-verifies the round is
actually `revealed` server-side (never trusts the client's belief about
reveal state).

## Reminders and expiration

`app/api/cron/connections-expiry/route.ts` -- externally triggered (not in
`vercel.json`, which is already at Vercel Hobby's 2-job cap), same
`Authorization: Bearer CRON_SECRET` pattern as `weekly-prompts` /
`space-digest-emails`. Intended to run every 15-30 minutes. Responsibilities:

- Expire invitations past `invitation_expires_at` still `awaiting_acceptance`.
- Expire connections whose current round's `response_deadline_at` has
  passed with an unsubmitted participant.
- Send one reminder at the halfway point of a round's response window, and
  one in the final 6 hours before it closes -- never after a participant has
  submitted (each check re-reads `submitted_at`).
- Send scheduled-live reminders at 24h / 1h / 10min before
  `scheduled_start_at`.

All timing math is in `lib/utils/connectionReminders.ts` (pure functions,
unit tested) so the due/not-due logic doesn't depend on a live database to
verify. Every notification is deduped through `connection_notification_log`
(migration 077, extended by 078 with a `notification_type` column) keyed on
`(connection_id, user_id, notification_type)`, so a doubled-up or late cron
run cannot double-send.

## Live conversation

Two independent live modes, both opt-in and never inferred from ordinary
online/session presence:

- **Live now**: `connection_live_availability` (one row per user,
  self-expiring `available_until`). Toggled by
  `components/connections/LiveAvailabilityToggle.tsx` via
  `set_live_availability_now()` / `clear_live_availability_now()`. Matching
  reads should go through a service-role route (mirroring
  `/api/matching/find`), not direct client SELECT on other users' rows --
  the table's only client policy is "read your own row."
- **Scheduled**: `connection_availability` (windows submitted by each side)
  -> `lib/utils/availabilityOverlap.ts#calculateOverlappingSlots()` (pure,
  unit tested, UTC-instant based so DST never affects the math) -> confirmed
  via `confirm_live_slot()` into `connection_live_sessions`. The 20-minute
  timer's authoritative start is `mark_live_ready()`: only once **both**
  `connection_live_session_participants` rows have `ready_at` does the
  session flip to `active` with a server timestamp -- never the scheduled
  clock time, and never a client clock (`components/connections/LiveScheduler.tsx`).

Declining a live request never terminates the guided exchange
(`respond_live_request()` falls back to the prior async status).

## RLS and security

- Every new table has RLS enabled; almost none has a client-facing
  INSERT/UPDATE policy -- every mutation goes through a SECURITY DEFINER RPC
  (listed in migration 078), which re-verifies participation/authorization
  itself rather than trusting RLS to have already filtered anything.
- `connection_blocks` (migration 078) is the first real server-side block
  list -- previously `blockUser()`/`getBlockedUsers()` in
  `lib/data/connections.ts` were localStorage-only, so a block was
  unenforceable server-side. `create_connection_invitation()` now checks it
  in both directions.
- Decline/end reasons (`decline_reason_private`, `end_reason_private`) are
  never exposed to the other participant by any RPC or view.
- Reports reuse the existing `reports` table (migration 001/055) via
  `report_connection()`, same admin-review path as every other report type.

## UI

- `app/app/connections/page.tsx`: the dashboard gains a "Guided
  Connections" section (`components/connections/GuidedExchangeSection.tsx`)
  when the flag is on for that user, grouped into Invitations / Waiting for
  you / Waiting for them / Ready to reveal / Active exchanges / Live
  conversations / Completed / Expired or ended
  (`lib/utils/connectionDashboardBuckets.ts`, pure + unit tested). The
  legacy request/accept/suggested-connections UI is hidden for that user
  instead of removed; the legacy "Active Conversations" live-chat list stays
  visible regardless of the flag.
- `app/app/connections/[id]/page.tsx` (new): connection detail -- current
  round, response editor, reveal, acknowledgments, extension, live
  conversation, end/report.
- New components under `components/connections/`: `ConnectionStatusBadge`,
  `RoundResponseEditor`, `RevealPanel`, `AcknowledgmentPicker`,
  `LiveAvailabilityToggle`, `LiveScheduler`, `GuidedConnectionSuggestions`,
  `GuidedExchangeSection`.

## Relationship to the legacy live chat

`components/connections/ConnectionChat.tsx` and the `connection_requests` /
`connections` (legacy fields) / `connection_messages` tables are completely
untouched by this work and continue to function exactly as before for any
existing or newly created `connection_type = 'live'` row. Migration 080
backfills every pre-existing `connections` row with
`connection_type = 'live'` and a matching pair of `connection_participants`
rows so blocking/reporting/dashboard-listing logic that joins through
`connection_participants` also works for legacy rows.

## Known limitations / follow-up

- "Live now" matching (finding another available-now member) needs a
  dedicated service-role API route analogous to `/api/matching/find` --
  not built in this pass since no UI currently calls it beyond the toggle
  itself.
- No dedicated admin UI for authoring prompt sequences -- the schema
  (`connection_prompt_sequences` / `connection_prompts`) supports it, but
  only one sequence (the default 3-round "Guided Exchange") is seeded.
  Adding sequences today means an admin SQL insert.
- No automated RLS/RPC integration test harness against a live Supabase
  instance (this repo has no local `supabase/config.toml` / CLI project
  linked) -- covered instead by the manual QA checklist below and the pure
  logic Vitest suite (`npm run test`).
- `/api/matching/find`'s `blockedUserIds` param is still client-supplied;
  it isn't yet cross-checked against the new server-side `connection_blocks`
  table. Worth fixing before block-enforcement is fully trustworthy for the
  legacy suggestion flow (the new `create_connection_invitation()` RPC does
  check it correctly).

## Manual QA checklist (two-member journey)

1. As member A, invite member B to a guided connection.
2. As member B, see the invitation with A's name/photo/why-joined/theme; decline it privately, and confirm A only ever sees "not confirmed", never "rejected."
3. Send a second invitation from A to B; accept as B. Confirm status flips to `active` and round 1 opens for both.
4. Submit round 1 as A only. Confirm B still sees "your response is submitted" language and cannot see A's text.
5. Submit round 1 as B. Confirm both sides now see `revealed` with both texts, and an acknowledgment can be sent by either side.
6. Advance as A only; confirm B is unaffected (asynchronous, not simultaneous). Advance as B; confirm round 2 opens for both.
7. Repeat through round 3; confirm `exchange_complete` afterward.
8. Use the one-time extension as A; confirm B gets neutral "more time" language, not blame language, and that a second extension attempt is rejected.
9. Request a live conversation; accept as B; submit availability from both sides; confirm an overlapping slot is offered and confirmable.
10. Join the scheduled session as both; confirm the timer does not start until both have marked ready.
11. End a connection from either side at any stage; confirm the other side sees a neutral "connection ended" message with no reason shown.
12. Let an invitation or round sit past its deadline (or temporarily shorten `connection_invitation_expiry_hours`/`connection_round_response_hours` in `platform_settings` for testing) and run `GET /api/cron/connections-expiry` with the `CRON_SECRET` bearer token; confirm it expires appropriately and does not double-fire notifications on a second run.
13. Confirm an existing legacy live connection (pre-dating this migration) still opens `ConnectionChat.tsx` and functions unchanged.
