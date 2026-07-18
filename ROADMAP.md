# Roadmap

What's next for The Connection Room, grouped by confidence level. This is
not a list of committed dates or promises — items move between sections as
priorities shift. Nothing here should be read as "in progress" unless it's
in **Now**.

## Now

Fixes surfaced by the 2026-07 documentation audit that affect real
functionality, not just docs:

- Fix connection-concern reporting so it actually reaches the admin
  Concerns page across devices (currently `localStorage`-only on both
  ends — see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md#known-schema-risks)).
- Fix the broken admin-check RLS pattern on `offers`, `event_registrations`,
  and `admin_activity_logs` (the same `profiles.id = auth.uid()` bug
  already fixed on `events` in migration 046).
- Resolve the `weekly_notes` vs. `weekly_companion_notes` naming
  discrepancy — confirm which table is actually authoritative in
  production and either add the missing migration or remove the unused
  one.
- Reconcile `.env.example` with the environment variables the code
  actually reads (see [`README.md`](README.md#known-documentationimplementation-gaps)).

## Next

Product-direction items with real support in the current codebase or prior
planning docs, not yet built:

- Richer Connections: mutual contact exchange (email/phone/Zoom link) and
  couples-to-couples or individual-to-couple connection types — both
  explicitly called out as "Coming in Phase 2" in the Connections page's
  own UI copy (`app/app/connections/page.tsx`).
- A "My Reflections" archive view, surfacing a member's own past
  `user_reflections` in one place (the data already exists; no dedicated
  browsing UI does yet).
- "Continue Where You Left Off" improvements — it currently shows recent
  reflections and upcoming events; deeper personalization (e.g. picking up
  an in-progress Guided Rhythm week) is a natural next step given the data
  already tracked in `guided_rhythm_progress`.
- A monthly integration summary for Guided Rhythm, rolling up a member's
  weekly prompts/check-ins into one end-of-month reflection.

## Later

Lower-confidence, larger, or more speculative ideas:

- A weekly digest email summarizing community activity (distinct from the
  existing per-space new-post digest added in migration 054).
- Softer rhythm tracking — de-emphasizing "days since last visit"-style
  framing in favor of gentler, non-shaming re-engagement language,
  consistent with [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md)'s
  "invitation over pressure."
- Private, saved prompts a member can return to later, separate from the
  daily rotation.
- Enhanced demo isolation, if a `/preview` or guest-mode entry point is
  ever built — see the "Known limitation" in
  [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md#demo-isolation).
  Not needed today because no such entry point exists yet.

## Under consideration

Ideas without a clear implementation path yet:

- Further profile visibility refinements — e.g. giving `shared_spaces` an
  actual UI control (it's fully implemented at the RLS level but unused),
  or distinguishing `members_only` from `member_discovery` (currently
  identical in behavior).
- Live event reminders beyond the current advance-notice reminder banner.
- Role-based space permissions (moderators, etc.) — mentioned in earlier
  planning notes, no schema or code groundwork exists for it yet.
