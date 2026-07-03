-- Fix RLS policies to allow unauthenticated public access for read operations
-- This enables the app to work without requiring users to be logged in first

-- Enable RLS on tables that need it
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_companion_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS first_week_journey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guided_rhythm_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Badges are readable by all" ON badges;
DROP POLICY IF EXISTS "Badges readable" ON badges;
DROP POLICY IF EXISTS "Anyone can read badges" ON badges;
DROP POLICY IF EXISTS "Public read badges" ON badges;

-- Create unified public read policy for badges
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);

-- RLS Policies for user_badges (allow reading any user's badges)
DROP POLICY IF EXISTS "User badges are readable by all" ON user_badges;
DROP POLICY IF EXISTS "User badges readable" ON user_badges;
DROP POLICY IF EXISTS "Anyone can read user_badges" ON user_badges;
DROP POLICY IF EXISTS "Public read user_badges" ON user_badges;

CREATE POLICY "user_badges_public_read" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_users_insert" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_badges_users_delete" ON user_badges FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for spaces
DROP POLICY IF EXISTS "Anyone can view spaces" ON spaces;
CREATE POLICY "spaces_public_read" ON spaces FOR SELECT USING (true);

-- RLS Policies for posts
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_users_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for comments
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "comments_public_read" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_users_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reactions (if table exists)
CREATE POLICY IF NOT EXISTS "reactions_public_read" ON reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "reactions_users_insert" ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY IF NOT EXISTS "events_public_read" ON events FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "event_interests_public_read" ON event_interests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "event_interests_users_insert" ON event_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily companion content (public read)
CREATE POLICY IF NOT EXISTS "daily_companion_content_public_read" ON daily_companion_content FOR SELECT USING (true);

-- RLS Policies for weekly notes (public read)
CREATE POLICY IF NOT EXISTS "weekly_notes_public_read" ON weekly_notes FOR SELECT USING (true);

-- RLS Policies for journey progress (allow reading any user's progress for now)
CREATE POLICY IF NOT EXISTS "first_week_journey_progress_public_read" ON first_week_journey_progress FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "first_week_journey_progress_users_insert" ON first_week_journey_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for guided rhythm progress
CREATE POLICY IF NOT EXISTS "guided_rhythm_progress_public_read" ON guided_rhythm_progress FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "guided_rhythm_progress_users_insert" ON guided_rhythm_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
