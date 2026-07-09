-- Add is_seeded flag to profiles for tracking demo/seeded members
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE;

-- Add is_seeded flag to posts for tracking demo/seeded posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seeded_reactions JSONB DEFAULT '{}';

-- Add is_seeded flag to comments for tracking demo/seeded comments
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seeded_reactions JSONB DEFAULT '{}';

-- Add is_seeded flag to events for tracking demo/seeded events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE;

-- Add is_seeded flag to offers for tracking demo/seeded offers
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT FALSE;

-- Create index for efficient seeded content queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_seeded ON profiles(is_seeded);
CREATE INDEX IF NOT EXISTS idx_posts_is_seeded ON posts(is_seeded);
CREATE INDEX IF NOT EXISTS idx_comments_is_seeded ON comments(is_seeded);
CREATE INDEX IF NOT EXISTS idx_events_is_seeded ON events(is_seeded);
CREATE INDEX IF NOT EXISTS idx_offers_is_seeded ON offers(is_seeded);

-- Update existing demo data to mark as seeded
-- This marks demo members as seeded (anyone who joined before this migration)
UPDATE profiles
SET is_seeded = TRUE
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Mark demo posts and comments as seeded (existing ones are demo data)
UPDATE posts
SET is_seeded = TRUE
WHERE id IN (
  SELECT id FROM posts
  WHERE created_at < NOW() - INTERVAL '1 hour'
  LIMIT 1000
);

UPDATE comments
SET is_seeded = TRUE
WHERE id IN (
  SELECT id FROM comments
  WHERE created_at < NOW() - INTERVAL '1 hour'
  LIMIT 1000
);

-- Mark demo events and offers as seeded
UPDATE events
SET is_seeded = TRUE
WHERE created_at < NOW() - INTERVAL '1 hour';

UPDATE offers
SET is_seeded = TRUE
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Add comment for seeded_reactions tracking
-- seeded_reactions tracks reaction counts that came from seeded/demo data
-- Format: { "👍": 5, "🔥": 3 } means 5 thumbs up and 3 fire reactions were added by seeded content
