# Your Experience Wanted

Occasional, low-pressure email invitations that bring members back to answer a question from lived experience. **Answers always happen in the app; email only invites.** Sending is **off** until an admin runs a dry run and activates it.

## How it fits the app

| Piece | Where |
|---|---|
| Schema, ledger, atomic claim, anonymity guard | `supabase/migrations/104_your_experience_wanted.sql` |
| Database self-check (rolls itself back) | `supabase/verify/104_verify_your_experience_wanted.sql` |
| Seed bank (60 prompts, stable ids) | `supabase/seed/experience-seed-questions.json` |
| Rules engine (pure, tested) | `lib/experience/{time,policy,selection,engine}.ts` |
| Production store / mailer | `lib/experience/{supabase-store,mailer}.ts`, `lib/email/send.ts` (`sendExperienceEmail`) |
| Scheduler tick | `app/api/cron/experience` (hourly, `CRON_SECRET`) |
| Email link → thread | `app/r/experience/[invitationId]` (logs a visit, redirects) |
| Unsubscribe | `app/experience/unsubscribe` (page) + `app/api/experience/unsubscribe` (POST / one-click) |
| Bounces & complaints | `app/api/webhooks/email-events` (SMTP2GO) |
| Member pages | `/app/experience`, `/app/experience/[id]`, `/app/experience/preferences`, home card, nav "Experience" |
| Admin | `/app/admin/experience` |
| Tests + 200-day simulation | `lib/experience/*.test.ts` (`npx vitest run lib/experience`) |

**Threads reuse the discussion system.** An activated question is a `posts` row in the unlisted space `your-experience`; responses and replies are ordinary `comments`, with the existing editing, deleting, notifications, drafts and growing text boxes. The space is hidden from the Spaces list, and its old URLs redirect to `/app/experience`.

## Rules (and where they're enforced)

1. **Bootstrap**: the first 3 *calendar* months after the single launch time (feature timezone, default `America/Los_Angeles`; month-end clamped, e.g. Jan 31 → Apr 30). `launched_at`, `bootstrap_ends_at` and the timezone are set once, on first activation, and a trigger refuses any later change. Pausing, deploying and re-importing never reset them.
2. **Sources.** During bootstrap, eligible member questions come first and seeds fill the gaps. After bootstrap:
   - `recycle_and_member` (default): member questions, plus seeds **first activated during bootstrap**, sent to new recipients only.
   - `member_only`: member questions only.

   If nothing qualifies, the wave sends nothing; questions are never invented.
3. **Seeds** are labeled **"Community prompt"** and member questions **"Member question"**, everywhere and in the email intro line.
4. **Cadence.** A wave runs every 14–21 days (default 21). That's the *campaign* cadence, not how often a member is emailed. An hourly tick dispatches individual invitations as they come due.
5. **Per-member limits**: at most **one invitation per calendar month** (feature timezone) **and** at least **30 days** (720 hours) apart. They're checked when a wave is planned, and again atomically at send time: `experience_claim_invitation` takes a per-member lock and counts every sent, sending or possibly-sent invitation. Manual inserts, retries and config changes can't bypass them. There are no reminders, and skipping waves is normal.
6. **A question is never sent to the same member twice, ever.** A partial unique index on `(user_id, question_id)` covers every invitation that reached, or may have reached, the provider. Editing, recycling, continuation threads and re-imports keep the same question id.
7. **Staggering.** Invitations are spread over a 7-day window using a stable per-member/per-wave offset, between 09:00 and 18:00 in the member's timezone (taken from their browser when they save preferences; the feature timezone otherwise). Other limits:
   - at most 5 recipients per question per wave;
   - fair ordering: never invited first, then longest since last invited;
   - at most one pending invitation per member (unique index);
   - anything that misses its window expires, rather than going out in a burst.
8. **Eligibility.** An invitation needs an active, verified, onboarded, unsuspended member with notification emails not set to **Off**, who hasn't opted out or paused, and whose address isn't suppressed (hard bounce or complaint). The question's topic must be allowed:
   - general topics by default;
   - the 6 sensitive topics only when the member explicitly chose them.

   Excluded as well: the question's author, members who already responded, prior recipients, either side of a block, and questions that are closed, removed, reported or not approved.

Everything in rule 8 is checked again at send time. An invitation that's no longer valid is **dropped with a recorded reason**, and no replacement is sent.

## Anonymous questions

- **Member questions are anonymous by default.** Members see **"A member"**; the author can choose to post with their name.
- **The author's own follow-ups** in that thread show as **"Question author"**.
- **How it's kept private:**
  - Anonymous threads and follow-ups are stored under the system account.
  - The link to the real person lives only in service-role tables (`experience_questions.author_id`, `experience_anonymous_comments`), which only moderators can see on the admin page.
  - A trigger refuses any comment or reaction the author tries to make under their real account in their own anonymous thread, so a follow-up can't accidentally reveal them.
  - Notifications reach the real author privately.

## Moderation (exception-based)

- **Member questions go live in the app immediately**, like any post.
- **The review queue only gets:**
  - questions whose author asked to include them in emails (an approval of that exact text);
  - likely paraphrases of an existing question;
  - open reports;
  - "unknown" deliveries.
- **Workload:** expect a handful a month. Ordinary posts don't need approval.
- **Reports** go into the existing `reports` table, and a question with an open report is never emailed.
- **Email permission:** authors can withdraw it at any time, which stops every future email at the next send check. An edited question goes back to review before it's emailed again.

## Email

- **Subject:** "Your experience is invited in The Connection Room". The subject and preview text never contain the question.
- **Body:** HTML-escaped, with a plain-text version.
- **Footer:** links to manage invitations and unsubscribe, plus `List-Unsubscribe` one-click headers.
- **Link:** `/r/experience/{invitationId}`. It logs a visit, then opens `/app/experience/{questionId}?respond=1`. Signed-out members sign in and land back on the same thread with the response box open.
  - The link carries no email address or login token.
  - A GET never answers anything or changes any content.
- **Replies by email aren't published.** The copy says to respond in the app; Reply-To still reaches Trevor's inbox, as with every other email.
- **Delivery states:**
  - **Accepted:** SMTP 250, counted as sent.
  - **Refused:** the same invitation is retried, up to 3 attempts, within the window and inside send hours.
  - **Ambiguous** (e.g. a timeout): marked `unknown`; it counts toward the member's limits, is **never resent**, and is flagged for review.
  - A worker that dies mid-send leaves `sending`, which becomes `unknown` after 15 minutes.
  - SMTP2GO over SMTP has no idempotency key; the stable `Message-ID` (`<experience-{id}@host>`) ties events to the ledger.

## Admin (`/app/admin/experience`)

1. **Import / check seed bank.** Idempotent by seed id. It never publishes seeds (each gets a thread only when first actually sent) and never overwrites staff edits. If the seed file's wording changed, it offers an explicit "Apply the file's wording".
2. **Settings**: post-bootstrap mode, wave interval (14–21), delivery spread, per-question cap, attribution window, and test recipients. The timezone locks at launch.
3. **Test email**: only to listed test recipients, marked [TEST], never recorded in the ledger.
4. **Dry run, then Activate.** The dry run shows planned invitations and every exclusion reason. Activation is only possible within 60 minutes of a dry run, and the first activation sets the locked launch date.
5. **Pause / Resume.** Pausing stops sends and new waves; scheduled invitations expire if their window passes. Resuming doesn't reset limits or the launch date.
6. **Review**: email approvals, paraphrase flags, reports, unknown deliveries ("It was delivered" / "It wasn't sent"; the latter releases the reservation without resending), and delivery failures.
7. **Metrics** (counts only):
   - accepted invitations and unique link visits;
   - responses in the app, and replies to other members;
   - unique contributors, and contributors to 2+ questions;
   - opt-outs, complaints and failures;
   - conversion: the recipient responded to *that* question within the attribution window (default 14 days).

   Email opens aren't used.

## Setup checklist

1. **Run the migration.** In Supabase, go to SQL Editor → New query, paste `104_your_experience_wanted.sql` and click Run. Confirm any "destructive operation" prompt; it only drops and recreates this feature's own functions and triggers.
2. **Run the self-check** (`supabase/verify/104_verify_your_experience_wanted.sql`). Expect a red box reading **"VERIFY RESULT: 9 of 9 checks passed."** It rolls itself back.
3. **Deploy** the code.
4. **Add an environment variable in Vercel:** `EMAIL_WEBHOOK_SECRET` (any long random string). `EXPERIENCE_TOKEN_SECRET` is optional; if it's unset, unsubscribe links are signed with a key derived from the service-role key.
5. **Connect SMTP2GO's webhook.** Settings → Webhooks → `https://community.trevorjamesla.com/api/webhooks/email-events?token=<EMAIL_WEBHOOK_SECRET>`, with events Bounce, Spam, Unsubscribe. Send SMTP2GO's test event and confirm a row appears in `email_provider_events`. If its field names differ, adjust `lib/experience/provider-events.ts`.
6. **Admin page:** import the seed bank, set test recipients, send a test email and check it on a phone.
7. **Run a dry run** and read the exclusions.
8. **Activate.**
9. **Schedule the job in cron-job.org:** an hourly GET to `https://community.trevorjamesla.com/api/cron/experience`, with header `Authorization: Bearer <CRON_SECRET>`. Until activation, it does nothing.

## Rollback

- **Pause** on the admin page is the normal off switch, and it keeps all history.
- **To remove the feature entirely,** use the commented SQL at the bottom of the migration. Threads stay as ordinary posts.
- **Account deletion** removes that member's invitation history (cascade).

## Simulation

`npx vitest run lib/experience/simulation.test.ts --silent=false` runs 200 days of hourly ticks in each post-bootstrap mode. It uses 80 synthetic members with mixed preferences, a small question pool, member submissions, and random provider failures. It asserts every rule and prints send counts and exclusion reasons. No email is sent.
