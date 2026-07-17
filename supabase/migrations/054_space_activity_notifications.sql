-- Space activity notifications.
--
-- Members already get a passive "N new posts" unread count (per-space badge
-- on the Spaces page, total badge in the desktop sidebar -- both driven by
-- space_memberships.last_visited_at vs posts.created_at, see migration 005).
-- This adds real email notifications for new space activity, with a
-- member-chosen frequency: immediate, daily digest, weekly digest, or off.
--
-- ARCHITECTURE: createSupabasePost() (lib/data/supabase-posts.ts) writes
-- directly from the browser via the anon key -- there is no server-side
-- "create post" route to hook an immediate-notification send into. Rather
-- than moving post creation to a new API route (a bigger, riskier change
-- than this feature needs), a trigger on `posts` fires an async, non-
-- blocking HTTP call (via pg_net, a standard Supabase extension) to a new
-- Next.js API route, which does the actual member lookup + email send in
-- TypeScript. This mirrors the fire-and-forget pattern Supabase's own
-- "Database Webhooks" feature uses under the hood.
--
-- Daily/weekly digests are handled by a *separate* cron route
-- (app/api/cron/space-digest-emails/route.ts), deliberately NOT added to
-- vercel.json -- this project already has 2 daily Vercel crons, and is
-- likely on the Hobby plan (2-cron cap). That route is triggered externally
-- (cron-job.org), secured the same Authorization: Bearer <CRON_SECRET> way
-- as the existing cron routes.

-- =====================================================================
-- 1. Notification frequency preference. Private, self-only setting with
-- no visibility dimension (no other member ever needs to see this), so it
-- lives on `profiles`, matching the existing convention for private
-- per-user settings (welcome_video_watched, onboarding_completed_at) --
-- not on `public_profiles`, which is reserved for member-visible data.
-- =====================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'off'));

-- =====================================================================
-- 2. Dedup/bookkeeping table. Mirrors the existing drip_emails_sent
-- pattern (migration 020). Internal bookkeeping only -- no member ever
-- needs to read this directly, so RLS is enabled with no member-facing
-- policies at all (service-role access only, used by the webhook/cron
-- routes below).
-- =====================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('immediate', 'daily', 'weekly')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevents double-emailing the same post to the same member if the
-- immediate webhook is ever retried (pg_net delivers at-least-once).
CREATE UNIQUE INDEX IF NOT EXISTS notification_log_immediate_dedup_idx
  ON notification_log (user_id, post_id)
  WHERE notification_type = 'immediate' AND post_id IS NOT NULL;

-- Fast lookup of "when did this user last get a daily/weekly digest".
CREATE INDEX IF NOT EXISTS notification_log_digest_lookup_idx
  ON notification_log (user_id, notification_type, sent_at DESC)
  WHERE notification_type IN ('daily', 'weekly');

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
-- No policies created -- RLS defaults to deny for every role except
-- service_role (which bypasses RLS entirely). Both the immediate webhook
-- route and the digest cron route use the service-role key.

-- =====================================================================
-- 3. Trigger: fire an async webhook call on every new post, so the
-- webhook route can email any member subscribed to "immediate" for that
-- space. pg_net queues the request and returns immediately -- this does
-- not block or slow down the post INSERT.
--
-- The webhook URL and shared secret are hardcoded literals below, same
-- pragmatic style already used for FROM_ADDRESS in lib/email/send.ts.
-- If the production domain or POST_NOTIFICATION_WEBHOOK_SECRET env var
-- ever changes, this function must be re-created (CREATE OR REPLACE) with
-- the new values -- it does not read them from application env vars,
-- Postgres has no access to those.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_new_post() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://community.trevorjamesla.com/api/webhooks/new-post-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET'
    ),
    body := jsonb_build_object(
      'postId', NEW.id,
      'spaceId', NEW.space_id,
      'authorId', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS posts_notify_new_post ON posts;
CREATE TRIGGER posts_notify_new_post
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_new_post();

-- =====================================================================
-- MANUAL STEP REQUIRED BEFORE THIS TRIGGER IS SAFE TO LEAVE ENABLED:
-- Replace 'REPLACE_WITH_POST_NOTIFICATION_WEBHOOK_SECRET' above with the
-- actual value you set for POST_NOTIFICATION_WEBHOOK_SECRET in Vercel's
-- environment variables, then re-run just this CREATE OR REPLACE FUNCTION
-- statement. Until that's done, the webhook call will 401 and simply
-- fail silently (pg_net logs the failed response in net._http_response,
-- it does not raise an error back into the posts INSERT).
-- =====================================================================

-- =====================================================================
-- ROLLBACK NOTES
--
-- To revert this migration:
--   DROP TRIGGER IF EXISTS posts_notify_new_post ON posts;
--   DROP FUNCTION IF EXISTS notify_new_post();
--   DROP TABLE IF EXISTS notification_log;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS notification_frequency;
--   -- pg_net is left installed (harmless, other features may use it later).
--
-- This migration does not touch any existing RLS policy and does not
-- modify migrations 001-053.
-- =====================================================================
