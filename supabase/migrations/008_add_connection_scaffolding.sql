-- Connection Scaffolding tables for Phase 1.5

-- Pairing Interests: Members can save themes they're open to pairing around
CREATE TABLE IF NOT EXISTS pairing_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  space_id TEXT,
  prompt_id TEXT,
  source_type TEXT CHECK (source_type IN ('prompt', 'post', 'weekly_theme', 'space')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, theme, source_type)
);

-- Connection Milestones: Track non-gamified recognition of connection behaviors
CREATE TABLE IF NOT EXISTS connection_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('first-share', 'first-witness', 'thoughtful-witness', 'community-builder', 'steady-return')),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

-- Row Level Security

-- Enable RLS
ALTER TABLE pairing_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_milestones ENABLE ROW LEVEL SECURITY;

-- Pairing Interests: Users can view and create their own
CREATE POLICY "Users can view their own pairing interests"
  ON pairing_interests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create pairing interests"
  ON pairing_interests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pairing interests"
  ON pairing_interests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Connection Milestones: Users can view and manage their own
CREATE POLICY "Users can view their own milestones"
  ON connection_milestones
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create milestones"
  ON connection_milestones
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for better query performance
CREATE INDEX idx_pairing_interests_user_id ON pairing_interests(user_id);
CREATE INDEX idx_pairing_interests_theme ON pairing_interests(theme);
CREATE INDEX idx_connection_milestones_user_id ON connection_milestones(user_id);
CREATE INDEX idx_connection_milestones_type ON connection_milestones(milestone_type);
