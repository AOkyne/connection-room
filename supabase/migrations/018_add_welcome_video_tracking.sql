-- Track whether a member has watched the onboarding welcome video.
-- Watching is optional and never blocks onboarding completion; this is best-effort tracking.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_video_watched BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_video_watched_at TIMESTAMPTZ;
