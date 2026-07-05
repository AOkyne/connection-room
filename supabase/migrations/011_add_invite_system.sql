-- Invite system for Phase 1.5
-- Adds invite codes and referral tracking to profiles

-- Add invite-related columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invited_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invite_code_created_at TIMESTAMP WITH TIME ZONE;

-- Create invite_relationships table for tracking who invited whom
CREATE TABLE IF NOT EXISTS invite_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_relationships_inviter ON invite_relationships(inviter_profile_id);
CREATE INDEX IF NOT EXISTS idx_invite_relationships_invited ON invite_relationships(invited_profile_id);
CREATE INDEX IF NOT EXISTS idx_invite_relationships_code ON invite_relationships(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);

-- Row Level Security

-- Enable RLS on invite_relationships
ALTER TABLE invite_relationships ENABLE ROW LEVEL SECURITY;

-- Invite Relationships Policies
-- Users can view their own invite relationships (what they've created)
CREATE POLICY "Users can view their own invites sent"
  ON invite_relationships
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = inviter_profile_id));

-- Users can view who invited them
CREATE POLICY "Users can view who invited them"
  ON invite_relationships
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = invited_profile_id));

-- Invite relationships are created by system (server-side only)
CREATE POLICY "System can create invite relationships"
  ON invite_relationships
  FOR INSERT
  WITH CHECK (false); -- Only allow via server-side functions

-- System function to generate invite code
-- Format: first-name-or-display-slug-random6
CREATE OR REPLACE FUNCTION generate_invite_code(display_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  random_suffix TEXT;
BEGIN
  -- Create slug from display name (first word, lowercase, alphanumeric only)
  slug := LOWER(REGEXP_REPLACE(SPLIT_PART(display_name, ' ', 1), '[^a-z0-9]', '', 'g'));

  -- If slug is empty, use generic prefix
  IF slug = '' THEN
    slug := 'member';
  END IF;

  -- Generate random 6-character suffix
  random_suffix := SUBSTR(MD5(gen_random_bytes(16)::text), 1, 6);

  -- Return formatted code
  RETURN slug || '-' || random_suffix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invite relationship after signup
CREATE OR REPLACE FUNCTION create_invite_relationship(
  p_invited_profile_id UUID,
  p_invite_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inviter_profile_id UUID;
BEGIN
  -- Find inviter by invite code
  SELECT id INTO v_inviter_profile_id FROM profiles WHERE invite_code = p_invite_code LIMIT 1;

  -- If no inviter found, silently return (invalid code is ok)
  IF v_inviter_profile_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Prevent self-referral
  IF v_inviter_profile_id = p_invited_profile_id THEN
    RETURN FALSE;
  END IF;

  -- Create invite relationship
  INSERT INTO invite_relationships (inviter_profile_id, invited_profile_id, invite_code)
  VALUES (v_inviter_profile_id, p_invited_profile_id, p_invite_code)
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
