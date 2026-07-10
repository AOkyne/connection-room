-- Add author fields to posts and comments tables
ALTER TABLE posts ADD COLUMN author_name TEXT;
ALTER TABLE posts ADD COLUMN author_pronouns TEXT;
ALTER TABLE posts ADD COLUMN author_photo TEXT;

ALTER TABLE comments ADD COLUMN author_name TEXT;
ALTER TABLE comments ADD COLUMN author_pronouns TEXT;
ALTER TABLE comments ADD COLUMN author_photo TEXT;

-- Create index on author_name for faster queries
CREATE INDEX idx_posts_author_name ON posts(author_name);
CREATE INDEX idx_comments_author_name ON comments(author_name);
