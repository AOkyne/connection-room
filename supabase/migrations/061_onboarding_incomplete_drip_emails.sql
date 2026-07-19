-- The existing drip sequence (day5/day14/day30, migration 021) only
-- nurtures members AFTER they finish onboarding -- it's anchored to
-- onboarding_completed_at, which is NULL for anyone who never finishes.
-- This adds a second, independent drip anchored to signup instead
-- (profiles.created_at, "when they started"), gated on
-- completed_onboarding = false, for members who started but never
-- completed their profile. Reuses the same email_templates/
-- drip_emails_sent tables and the same drip-emails cron -- it just adds
-- a second candidate query keyed off a different column.
--
-- Because the candidate query re-checks completed_onboarding = false on
-- every run, a member who completes their profile simply stops matching
-- and never receives the next one in the sequence -- no explicit
-- "unsubscribe" logic needed. And because the threshold is "created_at
-- <= now() - N days" rather than an exact-day match, this also
-- backfills every existing incomplete-onboarding member whose signup is
-- already past a given threshold the next time the cron runs, not just
-- new signups going forward.
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS days_after_signup_if_incomplete INTEGER;

INSERT INTO email_templates (key, subject, body, sign_off, days_after_signup_if_incomplete) VALUES
('onboarding-incomplete-day1', $s0$Finish setting up your Connection Room profile$s0$, $body0$Hello {{firstName}},

I noticed you started setting up your profile in The Connection Room but haven't quite finished yet.

No worries at all... life gets busy, and these things happen. I just wanted to make sure you knew your spot is still here, waiting for you.

Finishing your profile ({{appUrl}}/onboarding) only takes a few minutes, and it's the one thing that unlocks everything else: joining conversations, connecting with other members, and seeing what's happening in the community.

Whenever you're ready, just pick up right where you left off.$body0$, $so0$Warm hugs,$so0$, 1),
('onboarding-incomplete-day3', $s1$Your profile is still waiting for you$s1$, $body1$Hello {{firstName}},

A few days ago you started joining The Connection Room, and I wanted to check in.

Your profile isn't quite finished yet, which means you're missing out on everything the community has to offer... the daily reflections, the conversations happening in different Rooms, and the chance to connect with other members.

It really does only take a few minutes to finish ({{appUrl}}/onboarding).

If something got in the way, or if you have a question about how any of this works, just reply to this email. I'm happy to help.$body1$, $so1$Warm hugs,$so1$, 3),
('onboarding-incomplete-day5', $s2$Still here whenever you're ready$s2$, $body2$Hello {{firstName}},

I wanted to reach out one more time about finishing your Connection Room profile.

I know life gets full, and starting something new isn't always easy to prioritize. There's no pressure here... I just didn't want you to lose your spot without knowing it's still waiting for you.

If you'd like to jump back in, finishing your profile ({{appUrl}}/onboarding) takes just a few minutes.

And if now simply isn't the right time, that's completely okay too. The door stays open whenever you're ready.$body2$, $so2$Warm hugs,$so2$, 5)
ON CONFLICT (key) DO NOTHING;
