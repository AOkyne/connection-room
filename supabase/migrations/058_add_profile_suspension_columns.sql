-- Found while investigating admin dashboard issues: the member detail page
-- (app/app/admin/members/[id]/page.tsx) has had a fully-built "Suspend
-- Member" / "Unsuspend Member" UI, reading and writing
-- profiles.suspended/suspended_at/suspension_reason -- but no migration in
-- this repo has ever created these columns. Every suspend/unsuspend attempt
-- has been failing with a PGRST204 "column not found" error (surfaced to
-- the admin via a plain alert()), the same class of silent-write-failure
-- bug fixed repeatedly elsewhere in this project's history (migrations
-- 036, 042, etc.).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
