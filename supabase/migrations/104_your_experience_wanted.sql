-- 104: "Your Experience Wanted" -- invitations for members to share lived
-- experience on a question, answered in the app (never by email).
--
-- Design notes (full write-up: docs/your-experience-wanted.md):
--
-- * Threads reuse the existing discussion system: each ACTIVATED question
--   is a `posts` row in a dedicated, unlisted space ('your-experience');
--   responses and replies are ordinary `comments`. Seed questions get a
--   thread only when first actually sent to someone (lazy activation), so
--   the seed bank never floods the app.
-- * experience_invitations is the single ledger of every invitation, in
--   every state. Two partial unique indexes make the core promises durable
--   at the database level, whatever the application code does:
--     - a member can hold an invitation for a canonical question at most
--       once, ever (released only for invitations that were never handed
--       to the mail provider: dropped / expired / canceled);
--     - a member can have at most one pending (scheduled/retry/sending)
--       invitation at a time.
-- * experience_claim_invitation() is the only way an invitation moves to
--   'sending'. It takes a per-member advisory lock and re-checks the
--   calendar-month cap and the 30-day gap inside the same transaction, so
--   concurrent workers can't both send to one member.
-- * Anonymous member questions (the default): the thread post is stored
--   under the system account and shown as "A member"; the real author
--   lives only in experience_questions.author_id (service_role only, so
--   moderators can see it and members can't). The author's own follow-ups
--   in that thread are written the same way through an API route, with
--   the real author kept in experience_anonymous_comments. A trigger
--   refuses any comment or reaction the author tries to add under their
--   real account in their own anonymous thread, so a follow-up can never
--   accidentally reveal them.
-- * Everything here is service_role only (admin/cron API routes on the
--   service key). Members reach it through authenticated API routes that
--   return only safe fields. Explicit GRANTs per the Oct 30 2026 Supabase
--   change (migration 100's note).
--
-- ROLLBACK NOTES are at the bottom of the file.

-- =====================================================================
-- 1. The unlisted space that holds the threads
-- =====================================================================

INSERT INTO spaces (id, name, slug, description, icon, visibility)
VALUES (
  'your-experience',
  'Your Experience Wanted',
  'your-experience',
  'Questions where members share what they have lived through.',
  'commons',
  'free'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 2. Settings (single row)
-- =====================================================================

CREATE TABLE IF NOT EXISTS experience_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  paused BOOLEAN NOT NULL DEFAULT false,
  -- Set once, on first activation; never changed afterwards (trigger below).
  launched_at TIMESTAMPTZ,
  bootstrap_ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  post_bootstrap_mode TEXT NOT NULL DEFAULT 'recycle_and_member'
    CHECK (post_bootstrap_mode IN ('recycle_and_member', 'member_only')),
  wave_interval_days INT NOT NULL DEFAULT 21 CHECK (wave_interval_days BETWEEN 14 AND 21),
  stagger_days INT NOT NULL DEFAULT 7 CHECK (stagger_days BETWEEN 1 AND 7),
  per_question_cap INT NOT NULL DEFAULT 5 CHECK (per_question_cap BETWEEN 1 AND 50),
  send_window_start_hour INT NOT NULL DEFAULT 9 CHECK (send_window_start_hour BETWEEN 0 AND 23),
  send_window_end_hour INT NOT NULL DEFAULT 18 CHECK (send_window_end_hour BETWEEN 1 AND 24),
  attribution_days INT NOT NULL DEFAULT 14 CHECK (attribution_days BETWEEN 1 AND 60),
  max_sends_per_run INT NOT NULL DEFAULT 10 CHECK (max_sends_per_run BETWEEN 1 AND 50),
  test_recipients TEXT[] NOT NULL DEFAULT '{}',
  -- Admin account that "owns" seed threads in the posts table (shown to
  -- members only as "Community prompt").
  system_author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_dry_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (send_window_end_hour > send_window_start_hour)
);

INSERT INTO experience_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Default system author: the earliest admin account. Changeable on the
-- admin page.
UPDATE experience_settings
SET system_author_id = (
  SELECT user_id FROM profiles WHERE role = 'admin' AND user_id IS NOT NULL ORDER BY created_at LIMIT 1
)
WHERE id = 1 AND system_author_id IS NULL;

CREATE OR REPLACE FUNCTION experience_settings_lock_launch() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.launched_at IS NOT NULL AND NEW.launched_at IS DISTINCT FROM OLD.launched_at THEN
    RAISE EXCEPTION 'The launch date is locked once the feature has been activated';
  END IF;
  IF OLD.bootstrap_ends_at IS NOT NULL AND NEW.bootstrap_ends_at IS DISTINCT FROM OLD.bootstrap_ends_at THEN
    RAISE EXCEPTION 'The bootstrap end is locked once the feature has been activated';
  END IF;
  IF OLD.launched_at IS NOT NULL AND NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    RAISE EXCEPTION 'The feature timezone is locked once the feature has been activated';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experience_settings_lock_launch ON experience_settings;
CREATE TRIGGER experience_settings_lock_launch
  BEFORE UPDATE ON experience_settings
  FOR EACH ROW EXECUTE FUNCTION experience_settings_lock_launch();

-- =====================================================================
-- 3. Topics and questions
-- =====================================================================

CREATE TABLE IF NOT EXISTS experience_topics (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  -- Sensitive topics are only ever emailed to members who explicitly
  -- selected them.
  sensitive BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO experience_topics (slug, label, sensitive, sort_order) VALUES
  ('loneliness', 'Loneliness', false, 1),
  ('friendship', 'Friendship', false, 2),
  ('affection', 'Affection', true, 3),
  ('vulnerability', 'Vulnerability', false, 4),
  ('boundaries', 'Boundaries', false, 5),
  ('dating', 'Dating', true, 6),
  ('relationships', 'Relationships', true, 7),
  ('body_aging', 'Body and aging', true, 8),
  ('belonging', 'Belonging', false, 9),
  ('sexuality_shame', 'Sexuality and shame', true, 10),
  ('receiving_care', 'Receiving care', false, 11),
  ('change_loss', 'Change and loss', true, 12)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS experience_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('seed', 'member')),
  -- Stable id from supabase/seed/experience-seed-questions.json; the
  -- importer matches on this, never on text.
  seed_key TEXT UNIQUE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  -- Lowercased, punctuation/space-collapsed text: blocks exact duplicates
  -- of an existing question under a new identity.
  normalized_text TEXT NOT NULL UNIQUE,
  -- Optional short context from a member author. In-app only; never emailed.
  context TEXT,
  -- Member questions: shown as "A member" with no link to the account
  -- (default). Seeds: not applicable.
  anonymous BOOLEAN NOT NULL DEFAULT true,
  topic TEXT NOT NULL REFERENCES experience_topics(slug),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'removed')),
  -- Author's explicit permission to circulate the question text by email
  -- (member questions; default off). Seeds are editorial: always true.
  email_permission BOOLEAN NOT NULL DEFAULT false,
  -- Admin review for email circulation of MEMBER text. Seeds import as
  -- 'approved'. Only 'approved' questions are ever emailed.
  email_review TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (email_review IN ('not_requested', 'pending', 'approved', 'rejected')),
  -- The exact text approved for email. Editing the question afterwards
  -- sends it back to review instead of emailing unreviewed text.
  email_text TEXT,
  -- Set when a new question looks like a paraphrase of an existing one;
  -- shown in the admin review queue, never silently merged.
  similar_to_question_id UUID REFERENCES experience_questions(id) ON DELETE SET NULL,
  first_activated_at TIMESTAMPTZ,
  thread_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  -- Earlier threads of the same question (admin "continuation" threads):
  -- responses there still count as having answered this question.
  previous_thread_post_ids UUID[] NOT NULL DEFAULT '{}',
  -- Seed text as last imported, to detect upstream seed-file changes
  -- without overwriting staff edits.
  seed_imported_text TEXT,
  staff_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- (No "member questions must have an author" check: author_id is SET
  -- NULL when the author deletes their account, and such a question is
  -- simply never emailed -- see questionEmailBlock's author_account_gone.)
  CHECK (source <> 'seed' OR seed_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_experience_questions_source_status ON experience_questions(source, status);
CREATE INDEX IF NOT EXISTS idx_experience_questions_thread ON experience_questions(thread_post_id);
CREATE INDEX IF NOT EXISTS idx_experience_questions_author ON experience_questions(author_id);

-- =====================================================================
-- 4. Member preferences
-- =====================================================================

CREATE TABLE IF NOT EXISTS experience_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_out BOOLEAN NOT NULL DEFAULT false,
  paused BOOLEAN NOT NULL DEFAULT false,
  -- NULL = default: every non-sensitive topic. Otherwise exactly the
  -- topics the member chose (sensitive ones only ever by explicit choice).
  topics TEXT[],
  -- Optional IANA zone for delivery hours; NULL = feature timezone.
  timezone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5. Waves and the invitation ledger
-- =====================================================================

CREATE TABLE IF NOT EXISTS experience_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  window_ends_at TIMESTAMPTZ NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('bootstrap', 'post_bootstrap')),
  source_mode TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_waves_starts ON experience_waves(starts_at DESC);

CREATE TABLE IF NOT EXISTS experience_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id UUID REFERENCES experience_waves(id) ON DELETE SET NULL,
  -- Deleting an account deletes its invitation history (privacy).
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES experience_questions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  state TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (state IN ('scheduled', 'retry', 'sending', 'sent', 'unknown', 'dropped', 'expired', 'canceled')),
  due_at TIMESTAMPTZ NOT NULL,
  window_ends_at TIMESTAMPTZ NOT NULL,
  selection_reason TEXT,
  drop_reason TEXT,
  attempts INT NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  -- Provider acceptance time: what the frequency limits count.
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  first_visit_at TIMESTAMPTZ,
  visit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (window_ends_at > due_at)
);

-- A member never gets the same canonical question twice. Only invitations
-- that never reached the provider (dropped / expired / canceled) release it.
CREATE UNIQUE INDEX IF NOT EXISTS experience_invitations_member_question_uq
  ON experience_invitations(user_id, question_id)
  WHERE state NOT IN ('dropped', 'expired', 'canceled');

-- At most one pending invitation per member across all waves.
CREATE UNIQUE INDEX IF NOT EXISTS experience_invitations_one_pending_uq
  ON experience_invitations(user_id)
  WHERE state IN ('scheduled', 'retry', 'sending');

CREATE INDEX IF NOT EXISTS idx_experience_invitations_due
  ON experience_invitations(due_at) WHERE state IN ('scheduled', 'retry');
CREATE INDEX IF NOT EXISTS idx_experience_invitations_member_history
  ON experience_invitations(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_invitations_question
  ON experience_invitations(question_id, state);
CREATE INDEX IF NOT EXISTS idx_experience_invitations_wave ON experience_invitations(wave_id);
CREATE INDEX IF NOT EXISTS idx_experience_invitations_message ON experience_invitations(provider_message_id);

-- =====================================================================
-- 6. Email suppressions and provider events (generic; any email feature
--    can use them)
-- =====================================================================

CREATE TABLE IF NOT EXISTS email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'manual')),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  -- Provider's own event id when it sends one; duplicate deliveries of the
  -- same webhook are ignored on this key.
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  message_id TEXT,
  email TEXT,
  occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS email_provider_events_dedup_uq
  ON email_provider_events(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_provider_events_message ON email_provider_events(message_id);

-- =====================================================================
-- 7. Audit trail (moderation decisions, settings changes, edits)
-- =====================================================================

CREATE TABLE IF NOT EXISTS experience_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  question_id UUID REFERENCES experience_questions(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES experience_invitations(id) ON DELETE CASCADE,
  -- Never the question body or member email -- ids and field names only.
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_audit_question ON experience_audit(question_id, created_at DESC);

-- =====================================================================
-- 7b. Anonymous authorship
-- =====================================================================

-- Follow-ups the author of an anonymous question posts in their own
-- thread. comments.user_id is the system account; this row (service_role
-- only) is the only link to the real author -- for their own edit/delete
-- and for moderators.
CREATE TABLE IF NOT EXISTS experience_anonymous_comments (
  comment_id UUID PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES experience_questions(id) ON DELETE CASCADE,
  real_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_anonymous_comments_user ON experience_anonymous_comments(real_user_id);

-- True when p_user_id is the real author of the anonymous question whose
-- thread (current or earlier) is p_post_id.
CREATE OR REPLACE FUNCTION experience_is_anonymous_author(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM experience_questions q
    WHERE q.anonymous
      AND q.source = 'member'
      AND q.author_id = p_user_id
      AND (q.thread_post_id = p_post_id OR p_post_id = ANY (q.previous_thread_post_ids))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION experience_guard_anonymous_comment() RETURNS TRIGGER AS $$
BEGIN
  IF experience_is_anonymous_author(NEW.post_id, NEW.user_id) THEN
    RAISE EXCEPTION 'experience_anonymous_author: post follow-ups to your anonymous question through the anonymous reply box';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS experience_guard_anonymous_comment ON comments;
CREATE TRIGGER experience_guard_anonymous_comment
  BEFORE INSERT OR UPDATE OF user_id, post_id ON comments
  FOR EACH ROW EXECUTE FUNCTION experience_guard_anonymous_comment();

CREATE OR REPLACE FUNCTION experience_guard_anonymous_reaction() RETURNS TRIGGER AS $$
DECLARE
  v_post_id UUID;
BEGIN
  v_post_id := NEW.post_id;
  IF v_post_id IS NULL AND NEW.comment_id IS NOT NULL THEN
    SELECT post_id INTO v_post_id FROM comments WHERE id = NEW.comment_id;
  END IF;
  IF v_post_id IS NOT NULL AND experience_is_anonymous_author(v_post_id, NEW.user_id) THEN
    RAISE EXCEPTION 'experience_anonymous_author: reactions would reveal the author of an anonymous question';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS experience_guard_anonymous_reaction ON reactions;
CREATE TRIGGER experience_guard_anonymous_reaction
  BEFORE INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION experience_guard_anonymous_reaction();

-- =====================================================================
-- 8. Atomic claim: the only path from scheduled/retry -> sending
-- =====================================================================
--
-- Returns 'ok', or the reason the invitation can't be sent right now.
-- Limits count every invitation the provider accepted ('sent'), might
-- have accepted ('unknown'), or is being sent ('sending'):
--   * at most one in the same calendar month in the feature timezone;
--   * at least 30 full days since the previous one.
-- The per-member advisory lock serializes concurrent workers.

CREATE OR REPLACE FUNCTION experience_claim_invitation(p_invitation_id UUID, p_now TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  v_inv experience_invitations%ROWTYPE;
  v_settings experience_settings%ROWTYPE;
  v_last TIMESTAMPTZ;
  v_same_month BOOLEAN;
BEGIN
  SELECT * INTO v_settings FROM experience_settings WHERE id = 1;
  IF NOT v_settings.enabled OR v_settings.paused THEN
    RETURN 'feature_paused';
  END IF;

  SELECT * INTO v_inv FROM experience_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('experience:' || v_inv.user_id::text, 0));

  IF v_inv.state NOT IN ('scheduled', 'retry') THEN
    RETURN 'not_pending';
  END IF;
  IF p_now < v_inv.due_at THEN
    RETURN 'not_due';
  END IF;
  IF p_now >= v_inv.window_ends_at THEN
    RETURN 'window_passed';
  END IF;

  SELECT
    MAX(COALESCE(sent_at, claimed_at)),
    BOOL_OR(
      date_trunc('month', COALESCE(sent_at, claimed_at) AT TIME ZONE v_settings.timezone)
        = date_trunc('month', p_now AT TIME ZONE v_settings.timezone)
    )
  INTO v_last, v_same_month
  FROM experience_invitations
  WHERE user_id = v_inv.user_id
    AND id <> v_inv.id
    AND state IN ('sending', 'sent', 'unknown');

  IF COALESCE(v_same_month, false) THEN
    RETURN 'month_cap';
  END IF;
  IF v_last IS NOT NULL AND p_now < v_last + INTERVAL '30 days' THEN
    RETURN 'cooldown_30_days';
  END IF;

  UPDATE experience_invitations
  SET state = 'sending', claimed_at = p_now, attempts = attempts + 1, updated_at = NOW()
  WHERE id = v_inv.id;

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 9. Lazy thread activation (first real send of a question)
-- =====================================================================
--
-- Creates the question's thread post if it doesn't have one, and records
-- first_activated_at once. Locked per question so two workers can't
-- create two threads. Returns the thread post id.

CREATE OR REPLACE FUNCTION experience_activate_question(p_question_id UUID, p_now TIMESTAMPTZ)
RETURNS UUID AS $$
DECLARE
  v_q experience_questions%ROWTYPE;
  v_author UUID;
  v_post_id UUID;
BEGIN
  SELECT * INTO v_q FROM experience_questions WHERE id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  IF v_q.thread_post_id IS NOT NULL THEN
    IF v_q.first_activated_at IS NULL THEN
      UPDATE experience_questions SET first_activated_at = p_now WHERE id = v_q.id;
    END IF;
    RETURN v_q.thread_post_id;
  END IF;

  SELECT system_author_id INTO v_author FROM experience_settings WHERE id = 1;
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'No system author configured for seed threads';
  END IF;

  INSERT INTO posts (user_id, space_id, prompt_id, title, body, author_name)
  VALUES (v_author, 'your-experience', 'experience:' || v_q.id::text, NULL, v_q.text, 'Community prompt')
  RETURNING id INTO v_post_id;

  UPDATE experience_questions
  SET thread_post_id = v_post_id,
      first_activated_at = COALESCE(first_activated_at, p_now),
      updated_at = NOW()
  WHERE id = v_q.id;

  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 10. Access: service_role only
-- =====================================================================

ALTER TABLE experience_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_anonymous_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON experience_settings, experience_topics, experience_questions, experience_preferences,
  experience_waves, experience_invitations, email_suppressions, email_provider_events, experience_audit,
  experience_anonymous_comments
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON experience_settings, experience_topics, experience_questions,
  experience_preferences, experience_waves, experience_invitations, email_suppressions,
  email_provider_events, experience_audit, experience_anonymous_comments
  TO service_role;

REVOKE ALL ON FUNCTION experience_claim_invitation(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION experience_activate_question(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION experience_claim_invitation(UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION experience_activate_question(UUID, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION experience_is_anonymous_author(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION experience_is_anonymous_author(UUID, UUID) TO service_role;

-- =====================================================================
-- ROLLBACK NOTES
--
-- Pausing is the normal "off switch" (admin page) and keeps all history.
-- Full removal (deletes every invitation record and the threads' link to
-- their questions; the threads themselves stay as posts):
--
-- DROP TRIGGER IF EXISTS experience_guard_anonymous_comment ON comments;
-- DROP TRIGGER IF EXISTS experience_guard_anonymous_reaction ON reactions;
-- DROP FUNCTION IF EXISTS experience_guard_anonymous_comment();
-- DROP FUNCTION IF EXISTS experience_guard_anonymous_reaction();
-- DROP FUNCTION IF EXISTS experience_is_anonymous_author(UUID, UUID);
-- DROP TABLE IF EXISTS experience_anonymous_comments;
-- DROP FUNCTION IF EXISTS experience_activate_question(UUID, TIMESTAMPTZ);
-- DROP FUNCTION IF EXISTS experience_claim_invitation(UUID, TIMESTAMPTZ);
-- DROP TABLE IF EXISTS experience_audit, experience_invitations, experience_waves,
--   experience_preferences, experience_questions, experience_topics,
--   experience_settings, email_provider_events, email_suppressions;
-- DROP FUNCTION IF EXISTS experience_settings_lock_launch();
-- DELETE FROM spaces WHERE id = 'your-experience' AND NOT EXISTS
--   (SELECT 1 FROM posts WHERE space_id = 'your-experience');
-- =====================================================================
