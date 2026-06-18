-- Phase 1.1 Beta Schema
-- Minimal tables for beta testing with real accounts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  pronouns TEXT,
  location TEXT,
  age_range TEXT,
  relationship_status TEXT,
  orientation TEXT,
  profile_photo TEXT,
  member_type TEXT,
  what_brought_you_here TEXT,
  connection_hoping TEXT,
  interests JSONB DEFAULT '[]'::jsonb,
  pairing_comfort_level TEXT,
  pairing_boundaries TEXT,
  quiz_result TEXT,
  first_prompt_response TEXT,
  first_prompt_is_public BOOLEAN DEFAULT FALSE,
  completed_onboarding BOOLEAN DEFAULT FALSE,
  spaces_joined JSONB DEFAULT '[]'::jsonb,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couples profiles table
CREATE TABLE IF NOT EXISTS couples_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_1_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_2_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  couple_display_name TEXT,
  partner_2_name TEXT,
  partner_2_email TEXT,
  partner_invite_status TEXT DEFAULT 'not_invited',
  relationship_length TEXT,
  relationship_structure TEXT,
  couple_goals JSONB DEFAULT '[]'::jsonb,
  couple_boundaries TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces table (seed data below)
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  visibility TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space memberships table
CREATE TABLE IF NOT EXISTS space_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, space_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_profile_id UUID REFERENCES couples_profiles(id) ON DELETE SET NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  prompt_id TEXT,
  title TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, reaction_type),
  UNIQUE(user_id, comment_id, reaction_type)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read public profiles, update own, create own
CREATE POLICY "Profiles are readable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Couples profiles: Partners can read/update their own
CREATE POLICY "Partners can read their couples profile"
  ON couples_profiles FOR SELECT
  TO authenticated
  USING (partner_1_user_id = auth.uid() OR partner_2_user_id = auth.uid());

CREATE POLICY "Users can insert couples profile"
  ON couples_profiles FOR INSERT
  TO authenticated
  WITH CHECK (partner_1_user_id = auth.uid());

CREATE POLICY "Partners can update couples profile"
  ON couples_profiles FOR UPDATE
  TO authenticated
  USING (partner_1_user_id = auth.uid() OR partner_2_user_id = auth.uid())
  WITH CHECK (partner_1_user_id = auth.uid() OR partner_2_user_id = auth.uid());

-- Spaces: Readable by authenticated users
CREATE POLICY "Spaces are readable by authenticated users"
  ON spaces FOR SELECT
  TO authenticated
  USING (TRUE);

-- Space memberships: Users can manage their own
CREATE POLICY "Users can read their space memberships"
  ON space_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join spaces"
  ON space_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave spaces"
  ON space_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Posts: Authenticated users can read, create own, edit/delete own
CREATE POLICY "Posts are readable by authenticated users"
  ON posts FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Comments: Authenticated users can read, create own, edit/delete own
CREATE POLICY "Comments are readable by authenticated users"
  ON comments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Reactions: Users can manage own
CREATE POLICY "Reactions are readable by authenticated users"
  ON reactions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can create reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Reports: Users can create reports, read only own
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Seed initial spaces
INSERT INTO spaces (name, slug, description, icon) VALUES
  ('The Commons', 'commons', 'A welcoming space for introductions, questions, and general connection', 'commons'),
  ('Start Here', 'start-here', 'Orientation and first reflections for new members', 'start-here'),
  ('Intimacy Patterns', 'intimacy-patterns', 'Exploring attachment, desire, vulnerability, and relational patterns', 'intimacy-patterns'),
  ('Touch & Affection', 'touch-affection', 'Non-sexual touch, giving, and receiving in safe ways', 'touch-affection'),
  ('Spirituality, Sexuality & Integration', 'spirituality-sexuality', 'Integrating spirit, sexuality, body, and emotion', 'spirituality-sexuality'),
  ('Dating, Desire & Vulnerability', 'dating-desire', 'Exploring attraction, desire, dating, and vulnerability', 'dating-desire'),
  ('Couples, Closeness & Repair', 'couples', 'For partnered individuals and couples', 'couples'),
  ('Embodiment Practice', 'embodiment', 'Coming back to your body: breath, sensation, presence', 'embodiment'),
  ('Workshops & Retreats', 'workshops', 'Announcements and discussions about workshops and retreats', 'workshops')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS space_memberships_user_id_idx ON space_memberships(user_id);
CREATE INDEX IF NOT EXISTS space_memberships_space_id_idx ON space_memberships(space_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_space_id_idx ON posts(space_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON reactions(post_id);
CREATE INDEX IF NOT EXISTS reactions_comment_id_idx ON reactions(comment_id);
