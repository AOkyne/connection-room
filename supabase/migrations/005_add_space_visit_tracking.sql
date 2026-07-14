-- Add last_visited_at to track when users last visited each space
-- Used to show "new posts since last visit" badges

ALTER TABLE space_memberships
ADD COLUMN last_visited_at TIMESTAMP DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX idx_space_memberships_last_visited ON space_memberships(user_id, space_id, last_visited_at);
