-- Guided Rhythm Progress tracking table

CREATE TABLE IF NOT EXISTS guided_rhythm_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_month INT NOT NULL DEFAULT 1,
  current_week INT NOT NULL DEFAULT 1,
  private_reflections JSONB DEFAULT '{}',
  monthly_integrations JSONB DEFAULT '{}',
  monthly_intentions JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE guided_rhythm_progress ENABLE ROW LEVEL SECURITY;

-- Users can only read and update their own guided rhythm progress
CREATE POLICY "Users can read own guided rhythm progress"
  ON guided_rhythm_progress FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own guided rhythm progress"
  ON guided_rhythm_progress FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own guided rhythm progress"
  ON guided_rhythm_progress FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create index for faster queries
CREATE INDEX idx_guided_rhythm_user_id ON guided_rhythm_progress(user_id);
