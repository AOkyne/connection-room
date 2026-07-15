-- Phase 6: Add theme tagging system for connecting daily themes to community content
-- Allows posts, spaces, events, articles, and comments to be tagged with themes
-- Enables "related to today's theme" content discovery

-- Add theme_tags JSONB column to posts table
ALTER TABLE posts ADD COLUMN theme_tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_posts_theme_tags ON posts USING GIN (theme_tags);

-- Add theme_tags JSONB column to spaces table
ALTER TABLE spaces ADD COLUMN theme_tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_spaces_theme_tags ON spaces USING GIN (theme_tags);

-- Add theme_tags JSONB column to events table
ALTER TABLE events ADD COLUMN theme_tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_events_theme_tags ON events USING GIN (theme_tags);

-- Add theme_tags JSONB column to articles table
ALTER TABLE articles ADD COLUMN theme_tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_articles_theme_tags ON articles USING GIN (theme_tags);

-- Add theme_tags JSONB column to comments table (optional but useful for deep theme exploration)
ALTER TABLE comments ADD COLUMN theme_tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_comments_theme_tags ON comments USING GIN (theme_tags);

-- Helper function to check if content matches a theme
-- Usage: SELECT * FROM posts WHERE matches_theme(theme_tags, 'boundaries');
CREATE OR REPLACE FUNCTION matches_theme(tags JSONB, theme_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN tags @> to_jsonb(ARRAY[theme_name]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to get theme-related content
-- Finds all content tagged with a specific theme
CREATE OR REPLACE FUNCTION get_content_by_theme(theme_name TEXT)
RETURNS TABLE (
  content_id UUID,
  content_type TEXT,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Posts with theme
  RETURN QUERY
  SELECT p.id, 'post'::TEXT, p.author_name, p.content, p.created_at
  FROM posts p
  WHERE p.theme_tags @> to_jsonb(ARRAY[theme_name])
  ORDER BY p.created_at DESC;

  -- Articles with theme
  RETURN QUERY
  SELECT a.id, 'article'::TEXT, a.title, a.excerpt, a.published_at
  FROM articles a
  WHERE a.theme_tags @> to_jsonb(ARRAY[theme_name])
  ORDER BY a.published_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS Policy: Users can read all theme tags (public discovery feature)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for reading theme tags (no restrictions - enables discovery)
CREATE POLICY "posts_read_with_themes"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "spaces_read_with_themes"
  ON spaces FOR SELECT
  USING (true);

CREATE POLICY "events_read_with_themes"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "articles_read_with_themes"
  ON articles FOR SELECT
  USING (true);

CREATE POLICY "comments_read_with_themes"
  ON comments FOR SELECT
  USING (true);

-- Policies for updating theme tags (admin only)
CREATE POLICY "posts_update_themes_admin"
  ON posts FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "spaces_update_themes_admin"
  ON spaces FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "events_update_themes_admin"
  ON events FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "articles_update_themes_admin"
  ON articles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "comments_update_themes_admin"
  ON comments FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
