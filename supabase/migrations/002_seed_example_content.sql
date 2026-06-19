-- Seed example posts for Start Here and The Commons spaces
-- Using a system user ID for these seeded posts

-- Create a system user for seed content (if not exists)
INSERT INTO profiles (id, display_name, member_type, completed_onboarding)
VALUES ('00000000-0000-0000-0000-000000000000', 'The Connection Room', 'individual', true)
ON CONFLICT DO NOTHING;

-- Start Here space: Orientation posts
INSERT INTO posts (id, space_id, user_id, author_name, content, is_prompt_response, created_at)
VALUES
  ('start-1', 'start-here', '00000000-0000-0000-0000-000000000000', 'The Connection Room',
   'Welcome to The Connection Room! 🌿

This is a space designed to help you get oriented and find your footing in our community. Whether you''re exploring connection for the first time or deepening existing relationships, you''ll find thoughtful community members here.

A few things to know:
• We prioritize authenticity, consent, and respect in all conversations
• This is a space for asking genuine questions and sharing vulnerabilities
• Everyone here is on their own journey - there''s no "right way" to be
• Gentle reactions and thoughtful comments are welcome',
   false, now()),

  ('start-2', 'start-here', '00000000-0000-0000-0000-000000000000', 'The Connection Room',
   'How to use The Connection Room:

1. **Join Spaces** - Browse and join communities around topics that resonate with you
2. **Read & Reflect** - Spend time with other members'' reflections and stories
3. **Contribute Thoughtfully** - When you''re ready, share your own thoughts and experiences
4. **Use Reactions** - React with "I relate," "Thoughtful," or other gentle affirmations
5. **Connect** - Through our optional pairing feature, have 20-minute conversations with other members

Start with one space and go at your own pace. There''s no rush.',
   false, now());

-- Add comments to the orientation posts
INSERT INTO comments (id, post_id, user_id, author_name, content, created_at)
VALUES
  ('comment-1', 'start-1', '00000000-0000-0000-0000-000000000000', 'The Connection Room',
   'You can also explore spaces in the sidebar to find communities around specific topics like intimacy, vulnerability, dating, and more.',
   now()),

  ('comment-2', 'start-2', '00000000-0000-0000-0000-000000000000', 'The Connection Room',
   'Remember: this space is designed for authentic connection. Take your time, honor your boundaries, and engage only with what feels right for you.',
   now());

-- The Commons space: Community interaction examples
INSERT INTO posts (id, space_id, user_id, author_name, content, is_prompt_response, created_at)
VALUES
  ('commons-1', 'commons', '00000000-0000-0000-0000-000000000000', 'The Connection Room',
   'Welcome to The Commons! 💫

This is our gathering place for introductions, questions, and general connection. Whether you''re new to the community or a returning member, this is a great place to:

• Introduce yourself and share what brought you here
• Ask questions about how things work
• Share experiences and get feedback from the community
• Find common ground with other members

We''re glad you''re here. Welcome!',
   false, now());

-- Update comment counts for posts
UPDATE posts SET comment_count = 1 WHERE id IN ('start-1', 'start-2');
UPDATE posts SET comment_count = 0 WHERE id IN ('commons-1');
